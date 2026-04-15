import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowCard } from "@/components/GlowCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrength } from "@/components/PasswordStrength";
import { toast } from "sonner";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const { user, loading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user came from a reset password link
  useEffect(() => {
    // Give some time for the auth state to update from the URL hash
    const timer = setTimeout(() => {
      if (!loading && !user) {
        toast.error("Invalid or expired reset link. Please request a new one.");
        navigate("/auth");
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = passwordSchema.safeParse({ password: password.trim(), confirmPassword: confirmPassword.trim() });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await updatePassword(password.trim());
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        // Check quiz completion before redirecting
        if (user) {
          const { data } = await supabase
            .from("quiz_progress")
            .select("completed_at")
            .eq("id", user.id)
            .single();
          navigate(data?.completed_at ? "/dashboard" : "/quiz");
        } else {
          navigate("/auth");
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <GlowCard className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">
              Reset Your <span className="gradient-text">Password</span>
            </h1>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="password">New Password</Label>
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
              <PasswordStrength password={password} />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`mt-2 ${passwordsMismatch ? "border-destructive focus-visible:ring-destructive" : passwordsMatch ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                minLength={6}
                required
              />
              {passwordsMismatch && (
                <p className="text-xs text-destructive mt-1">Passwords don't match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-500 mt-1">Passwords match ✓</p>
              )}
            </div>

            <Button
              type="submit"
              variant="neon"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </GlowCard>
      </div>
    </div>
  );
};

export default ResetPassword;
