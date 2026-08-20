# Testimonial Section Redesign (Home page)

Rework the "What Our Members Say" carousel on the Home page into a wide, horizontal card matching the reference layout — while keeping the existing dark neon Virtue Circles palette, Montserrat/Inter typography, and GlowCard treatment.

## Layout

- One large rounded GlowCard, wider container (max-w-5xl) instead of the current narrow centered stack.
- Desktop: two columns.
  - Left: circular profile image, ~200–240px, vertically centered, keeping the existing neon ring/border treatment.
  - Right: content stack in this order — 5-star rating, large quote, name, city/location.
- Generous gap between image and content; text left-aligned on desktop.
- Mobile: single column — image on top (centered, scaled to ~120–140px), then rating, quote, name, location; content centered. Compact padding so the card stays short.

## Content and data

- No changes to testimonial data, text, names, locations, ratings, or images. Same `testimonials` table query and fields.
- Fallback initial-letter avatar stays for rows without an image.

## Navigation

- Existing carousel state, auto-rotate, prev/next, and dot indicators are preserved as-is functionally.
- Controls move into the bottom-right of the card: subtle ghost/outline arrow buttons with small dots between them, using primary/muted-foreground tokens only.
- On mobile the controls center below the content.

## Styling

- Colors strictly from existing tokens (primary, accent, muted, muted-foreground, border, gradient-text). No orange/yellow/red from the reference.
- Stars keep `fill-primary text-primary`.
- Loading skeleton and the empty state update to match the new two-column shape.

## Scope

- Only `src/pages/Home.tsx` (the Review Carousel section). No other pages, components, or backend changes.
