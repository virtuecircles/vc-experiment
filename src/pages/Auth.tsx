import { useState, useEffect, useCallback } from "react";
import { trackSignUp, trackLogin, metaTrackSignUp } from "@/lib/analytics";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowCard } from "@/components/GlowCard";
import { useAuth } from "@/hooks/useAuth";
import { PasswordStrength } from "@/components/PasswordStrength";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Please enter your password"),
});

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type AuthMode = "signUp" | "signIn" | "forgotPassword";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signUp, signIn, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  const redirectParam = searchParams.get("redirect");
  const planParam = searchParams.get("plan");

  // Detect if this is an email confirmation link (has token_hash or access_token in URL)
  const isEmailConfirmLink = !!(
    searchParams.get("token_hash") ||
    searchParams.get("access_token") ||
    window.location.hash.includes("access_token")
  );

  const redirectAfterAuth = useCallback(async (userId: string) => {
    const pendingPlan = sessionStorage.getItem("selectedPlan");
    const plansOrDashboard = pendingPlan ? "/plans" : "/dashboard";

    // Fire-and-forget welcome email for new users only (created < 2 min ago)
    void (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("id", userId)
          .maybeSingle();
        if (profile?.created_at) {
          const createdAt = new Date(profile.created_at).getTime();
          if (createdAt > Date.now() - 2 * 60 * 1000) {
            await supabase.functions.invoke("send-auto-emails", {
              body: { emailType: "welcome_emails", user_id: userId },
            });
          }
        }
      } catch { /* ignore */ }
    })();

    const timeoutId = setTimeout(() => {
      navigate(plansOrDashboard);
    }, 5000);

    try {
      const [quizResult, profileResult] = await Promise.all([
        supabase.from("quiz_progress").select("completed_at").eq("id", userId).maybeSingle(),
        supabase.from("profiles").select("primary_virtue").eq("id", userId).maybeSingle(),
      ]);

      clearTimeout(timeoutId);

      const quizDone = !!(quizResult.data?.completed_at) || !!(profileResult.data?.primary_virtue);

      if (!quizDone) {
        navigate("/quiz-intro");
        return;
      }

      navigate(plansOrDashboard);
    } catch {
      clearTimeout(timeoutId);
      navigate(plansOrDashboard);
    }
  }, [navigate]);

  // Redirect already-logged-in users — including after email verification
  useEffect(() => {
    if (!loading && user) {
      redirectAfterAuth(user.id);
    }
  }, [user, loading, redirectAfterAuth]);

  // Listen for email verification completing ONLY when we're actually in confirmation flow
  useEffect(() => {
    if (!isEmailConfirmLink && !emailConfirmationSent) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "USER_UPDATED" || event === "SIGNED_IN") && session?.user) {
        toast.success("Email verified! Redirecting...");
        setEmailConfirmationSent(false);
        redirectAfterAuth(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [redirectAfterAuth, isEmailConfirmLink, emailConfirmationSent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "forgotPassword") {
      const validation = emailSchema.safeParse({ email });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSubmitting(true);
      try {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Password reset email sent! Check your inbox.");
          setMode("signIn");
        }
      } catch (err) {
        toast.error("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const schema = mode === "signUp" ? signUpSchema : authSchema;
    const validation = schema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "signUp") {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered") || error.message.includes("User already registered") || error.message.includes("already exists")) {
            toast.error("This email is already registered. Please sign in instead.");
            setMode("signIn");
          } else if (
            error.message.includes("over_email_send_rate_limit") ||
            error.message.includes("email rate limit") ||
            (error as any)?.status === 429
          ) {
            // Supabase email send rate limit — a confirmation email was already sent recently.
            // Treat this as success: the email is on its way.
            setEmailConfirmationSent(true);
            toast.info("A confirmation email was already sent to this address. Please check your inbox (and spam folder).");
          } else {
            toast.error(error.message);
          }
        } else {
          // Signup succeeded — show confirmation card. Supabase requires email
          // verification before the user can sign in, so we don't attempt a
          // silent sign-in here (doing so triggers rate limits).
          trackSignUp("email");
          metaTrackSignUp();
          setEmailConfirmationSent(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid email or password");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Please verify your email first. Check your inbox for the confirmation link.");
          } else if (error.message.includes("rate limit") || error.message.includes("after")) {
            toast.error("Too many attempts. Please wait 30 seconds and try again.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back! Redirecting...");
          trackLogin("email");
          const { data: { user: signedInUser } } = await supabase.auth.getUser();
          if (signedInUser) {
            await redirectAfterAuth(signedInUser.id);
            return;
          }
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show "check your email" card while waiting for verification (disappears once user is signed in)
  if (emailConfirmationSent) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <GlowCard className="p-8 text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-2xl font-display font-bold mb-3">Check Your Email</h1>
            <p className="text-muted-foreground mb-4">
              We sent a confirmation link to <strong>{email}</strong>.<br />
              Click the link in the email to verify your account and get started.
            </p>
            <p className="text-sm text-muted-foreground">
              Didn't receive it? Check your spam folder or{" "}
              <button
                type="button"
                onClick={() => setEmailConfirmationSent(false)}
                className="text-primary hover:underline"
              >
                try again
              </button>.
            </p>
          </GlowCard>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const getTitle = () => {
    if (mode === "forgotPassword") return "Reset Password";
    if (mode === "signUp") return "Join ";
    return "Welcome Back to ";
  };

  const getSubtitle = () => {
    if (mode === "forgotPassword") return "Enter your email to receive a password reset link";
    if (redirectParam === "plans" && planParam) {
      const planNames: Record<string, string> = {
        virtue_circles: "Virtue Circles (Monthly)",
        virtue_circles_annual: "Virtue Circles (Annual)",
        founding_100: "Founding Member",
      };
      const planName = planNames[planParam] || planParam;
      if (mode === "signUp") return `Create your account to start your ${planName} membership`;
      return `Sign in to continue to ${planName} checkout`;
    }
    if (mode === "signUp") return "Create your account and discover your virtue profile";
    return "Sign in to continue your journey";
  };

  const getButtonText = () => {
    if (isSubmitting) return "Please wait...";
    if (mode === "forgotPassword") return "Send Reset Link";
    if (mode === "signUp") return "Create Account & Start Quiz";
    return "Sign In";
  };

  return (
    <div className="min-h-screen py-20 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <GlowCard className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">
              {mode === "forgotPassword" ? (
                <>Reset <span className="gradient-text">Password</span></>
              ) : (
                <>
                  {getTitle()}
                  <span className="gradient-text">Virtue Circles</span>
                </>
              )}
            </h1>
            <p className="text-muted-foreground">{getSubtitle()}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2"
                required
              />
            </div>

            {mode !== "forgotPassword" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2"
                  minLength={6}
                  required
                />
                {mode === "signUp" && <PasswordStrength password={password} />}
              </div>
            )}

            {mode === "signIn" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgotPassword")}
                  className="text-primary hover:underline text-sm"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="neon"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {getButtonText()}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === "forgotPassword" ? (
              <button
                type="button"
                onClick={() => setMode("signIn")}
                className="text-primary hover:underline text-sm"
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
                className="text-primary hover:underline text-sm"
              >
                {mode === "signUp"
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            )}
          </div>
        </GlowCard>
      </div>
    </div>
  );
};

export default Auth;
