// Google Analytics 4 typed helpers
// Wraps window.gtag so the rest of the codebase never touches it directly.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const GA_ID = "G-NR26JEKG7C";

/** Fire a page_view event — call this on every route change in an SPA. */
export const trackPageView = (path: string, title?: string) => {
  if (!window.gtag) return;
  window.gtag("config", GA_ID, {
    page_path: path,
    page_title: title,
  });
};

/** Fire a named GA4 event with optional parameters. */
export const trackEvent = (
  action: string,
  params?: Record<string, string | number | boolean | undefined>
) => {
  if (!window.gtag) return;
  window.gtag("event", action, params);
};

// ── Convenience conversion helpers ──────────────────────────────────────────

/** User clicked "Create Account & Start Quiz" and submitted successfully. */
export const trackSignUp = (method = "email") =>
  trackEvent("sign_up", { method });

/** User signed in successfully. */
export const trackLogin = (method = "email") =>
  trackEvent("login", { method });

/** User started the virtue quiz (reached step 1). */
export const trackQuizStart = () =>
  trackEvent("quiz_start", { event_category: "quiz" });

/** User completed the virtue quiz and results were saved. */
export const trackQuizComplete = (primaryVirtue: string, isRetake = false) =>
  trackEvent("quiz_complete", {
    event_category: "quiz",
    primary_virtue: primaryVirtue,
    is_retake: isRetake,
  });

/** User clicked a plan's CTA button (before or at checkout). */
export const trackPlanSelected = (plan: string, billing?: string) =>
  trackEvent("plan_selected", {
    event_category: "conversion",
    plan_name: plan,
    billing_period: billing,
  });

/** Stripe checkout was created successfully (redirect about to happen). */
export const trackCheckoutInitiated = (plan: string) =>
  trackEvent("begin_checkout", {
    event_category: "conversion",
    plan_name: plan,
  });

// ── Meta Pixel (Facebook) helpers ───────────────────────────────────────────

const fbqTrack = (event: string, params?: Record<string, unknown>) => {
  if (!window.fbq) return;
  window.fbq("track", event, params);
};

/** Quiz started — fires InitiateCheckout. */
export const metaTrackQuizStart = () =>
  fbqTrack("InitiateCheckout", { content_name: "Virtue Quiz Started" });

/** Quiz completed — fires Lead. */
export const metaTrackQuizComplete = () =>
  fbqTrack("Lead", { content_name: "Virtue Quiz Completed" });

/** New user registered — fires CompleteRegistration. */
export const metaTrackSignUp = () =>
  fbqTrack("CompleteRegistration", { content_name: "New Member Signup" });

/** Plans page viewed — fires ViewContent. */
export const metaTrackPlansViewed = () =>
  fbqTrack("ViewContent", { content_name: "Plans Page Viewed" });

/** User selected a membership — fires AddToCart. */
export const metaTrackMembershipSelected = (value = 100, currency = "USD") =>
  fbqTrack("AddToCart", { content_name: "Membership Selected", value, currency });

/** Payment completed — fires Purchase. */
export const metaTrackPurchase = (value = 100, currency = "USD") =>
  fbqTrack("Purchase", { value, currency, content_name: "Virtue Circles Membership" });
