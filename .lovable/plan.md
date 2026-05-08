# Add "How It Works" Page

## Scope
- New page at `/how-it-works` showcasing the 3-step matching process, philosophy, and CTA.
- Reuses existing design system (GlowCard, gradient text, neon button variants, aurora background, Montserrat/Inter typography).
- Adds footer link under the "Company" column.
- SEO via existing `setPageMeta` helper from `src/lib/seo.ts` (no new dependency needed — the project already uses an internal SEO helper, not react-helmet-async).
- No changes to other pages, layouts, business logic, or data.

## Files

### 1. New file: `src/pages/HowItWorks.tsx`
Structure mirrors `Home.tsx` patterns:

- **Hero** — full-width section with `bg-gradient-to-b from-primary/10 via-secondary/5 to-background` overlay, badge chip, H1 with `gradient-text` span on "AI Friendship Matching", supporting paragraph, primary CTA button (`variant="neon"`) → `/quiz-intro`.
- **Steps 1–3** — alternating layout: Step 1 and Step 3 use a left-aligned numbered `GlowCard` + body text (image-less, two-column on md), Step 2 reverses the order. Each card shows a large gradient number ("01", "02", "03") and an icon (Sparkles, Brain, Users from lucide-react) consistent with homepage virtue cards. Subtle `animate-float` staggered delays.
- **Why This Works** — single centered `GlowCard` with `gradient-text` heading, two-paragraph body, mirroring the Aristotle section style (`bg-muted/30` band).
- **Final CTA** — centered `GlowCard` with H2, short supporting line, and `variant="neon"` button "Take the Free Virtue Quiz" → `/quiz-intro`.
- `useEffect` calls `setPageMeta({ title: "How AI Friendship Matching Works in Austin | Virtue Circles", description: "...", canonicalPath: "/how-it-works" })` on mount; calls `resetPageMeta` on unmount.
- All copy used verbatim from the request.

### 2. Edit: `src/App.tsx`
- Import `HowItWorks` and add `<Route path="/how-it-works" element={<HowItWorks />} />` above the catch-all.

### 3. Edit: `src/components/Layout.tsx`
- Add `<li><Link to="/how-it-works" className="hover:text-foreground">How It Works</Link></li>` to the Company column in the footer (top of list, above "About Virtue").

## Design tokens (already in design system)
- Typography: `font-display` (Montserrat) for headings, default body for paragraphs.
- Colors: `gradient-text`, `text-primary`, `text-secondary`, `text-accent`, `text-neon-blue/magenta/purple`.
- Effects: `GlowCard` for cards, `animate-float` for hero accents, `bg-muted/30` band for alternating sections, aurora background inherited from `Layout`.
- Buttons: `variant="neon"` for primary CTAs, `variant="outline"` for secondary.

## SEO
- Title: `How AI Friendship Matching Works in Austin | Virtue Circles` (60 chars — fits).
- Meta description: provided verbatim (~250 chars; `setPageMeta` truncates to 158 chars, which is acceptable; if we want the full description preserved we can shorten it before passing — will trim to a clean ~155-char version that keeps the key phrases "AI matching", "Austin", "virtue and values", "character not calendar").
- Canonical path: `/how-it-works`.
- Single `<h1>` per page; H2 for section headings; semantic `<section>` wrappers.

## Out of scope
- No changes to navigation header (only footer, per spec).
- No new icons, colors, fonts, or animations beyond what's already in the design system.
- No DB, auth, or RLS changes.
