# Seed Sample Testimonials

## Why it's blank
The `testimonials` table in this remixed project has zero rows, so every testimonial section (Circle Stories, Home carousel, Founding 100) renders the "No testimonials yet" empty card. The code is working — there is just no data.

## What I'll do
Insert 6 sample Virtue Circles testimonials, all visible and ordered, covering a mix of virtues (Courage, Friendship, Wisdom, Temperance, Justice, Gratitude) with Austin-area locations, 5- and 4-star ratings, and short first-person Members reviews using the project's terminology (Circles, Members, Meetups).

Each row fills: `name`, `location`, `rating`, `review`, `virtue`, `image_url`, `is_visible = true`, `display_order` 1-6.

Profile images use neutral portrait placeholder URLs so the new image-forward card design (large circular avatar → name/location → quote → stars) displays properly on Home, Circle Stories, and Founding 100.

## Notes
- No schema, RLS, role, or component changes — data insert only.
- Rows are ordinary records, so they can be edited or hidden anytime from the Admin → Testimonials tab.
