

## Meta Pixel Integration Plan

### Overview
Add the Meta Pixel (ID: `163706169749169`) to the Virtue Circles platform with base tracking and 6 custom conversion events at key user journey moments.

### Changes

**1. `index.html`** — Add base Meta Pixel code in `<head>` after the opening tag. The `<noscript>` fallback goes in `<body>` (HTML5 requirement — `<noscript><img>` is not valid inside `<head>`).

**2. `src/lib/analytics.ts`** — Add `fbq` to the Window interface declaration and create typed Meta Pixel helper functions:
- `fbqTrack(event, params)` — safe wrapper that checks `window.fbq` exists
- `metaTrackQuizStart()` — fires `InitiateCheckout`
- `metaTrackQuizComplete()` — fires `Lead`
- `metaTrackSignUp()` — fires `CompleteRegistration`
- `metaTrackPlansViewed()` — fires `ViewContent`
- `metaTrackMembershipSelected(value, currency)` — fires `AddToCart`
- `metaTrackPurchase(value, currency)` — fires `Purchase`

**3. `src/pages/Quiz.tsx`** — Import and call `metaTrackQuizStart()` when quiz begins and `metaTrackQuizComplete()` when results are saved (alongside existing GA4 calls).

**4. `src/pages/Auth.tsx`** — Import and call `metaTrackSignUp()` after successful signup (alongside existing `trackSignUp`).

**5. `src/pages/Plans.tsx`** — Import and call:
- `metaTrackPlansViewed()` in the existing `useEffect` on mount
- `metaTrackMembershipSelected(100, 'USD')` inside the `handleJoin` function (alongside existing `trackPlanSelected`)
- `metaTrackPurchase(100, 'USD')` after successful checkout creation (alongside `trackCheckoutInitiated`)

### Technical Notes
- Pixel ID `163706169749169` hardcoded in two places in `index.html` and once in `analytics.ts`
- All `fbq` calls are guarded with `if (!window.fbq) return` so the app never breaks if the script fails to load
- No new dependencies required

