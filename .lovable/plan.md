
The user wants a complete blog system. Let me check existing patterns quickly to align with the codebase conventions (admin tabs, routing, SEO).

Key considerations:
- Admin page exists with many tabs — add a "Blog" tab there for management
- Use existing UI components (Card, Button, Input, Textarea)
- Follow neon/aurora aesthetic with Montserrat headers
- Add RLS: public read, admin write
- SEO via dynamic `<title>` and `<meta>` injection (no react-helmet currently — use direct DOM updates in useEffect, matches lightweight approach)
- Image: use existing `event-images` storage bucket OR allow URL input (simpler — URL input for admin)

## Plan

### 1. Database (migration)
Create `public.blogs` table:
- `id` uuid PK default gen_random_uuid()
- `title` text not null
- `slug` text unique not null
- `content` text not null
- `excerpt` text (auto-derived in UI if null)
- `image_url` text
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()
- `author_id` uuid (optional, defaults to creator)
- `is_published` boolean default true

RLS policies:
- Public SELECT where `is_published = true`
- Admins (`super_admin`, `admin`, `vc_manager`) full ALL access via `has_any_role`

Seed 3 sample posts directly in the migration with rich content using Unsplash placeholder images.

### 2. Routes (src/App.tsx)
Add two new routes above the catch-all:
- `/blog` → `Blog` listing page
- `/blog/:slug` → `BlogDetail` page

### 3. New pages
**`src/pages/Blog.tsx`** — Listing
- Fetch all published blogs ordered by `created_at desc`
- Aurora background, page header "Insights & Stories"
- Responsive grid (1 col mobile, 2 tablet, 3 desktop) of `GlowCard`s
- Each card: image (16:9), title, excerpt (first 160 chars of content if no excerpt), formatted date
- Clicking navigates to `/blog/{slug}`
- Loading skeleton + empty state

**`src/pages/BlogDetail.tsx`** — Detail
- Fetch by slug; 404 redirect if not found
- Hero image, title, date, formatted long-form content (preserve paragraphs via `whitespace-pre-wrap`)
- "Back to Blog" link
- Dynamic SEO: `useEffect` updates `document.title` and meta description tag (create if missing) on mount/data load; restores defaults on unmount

### 4. Admin tab (src/components/admin/AdminBlogs.tsx)
Add to `src/pages/Admin.tsx` tab list as "Blog":
- List of existing posts (table: title, slug, date, actions: edit/delete)
- "New Post" button opens dialog with form: title, slug (auto-generated from title with manual override), image_url, content (textarea), is_published toggle
- Slug validation (lowercase, hyphens, unique check)
- Edit + delete with confirmation
- Uses Lovable design system (Dialog, Input, Textarea, Button)

### 5. SEO implementation
Lightweight approach (no new deps):
- Helper `src/lib/seo.ts` with `setPageMeta({ title, description })` that updates `document.title` and `<meta name="description">`
- Called from `Blog.tsx` (static defaults) and `BlogDetail.tsx` (per-post)

### 6. Technical notes
- Use `supabase` client from `@/integrations/supabase/client`
- Types auto-regenerate after migration — use generated `Database` types
- Slug generator: lowercase, replace non-alphanum with `-`, trim hyphens
- Date format via existing patterns (likely `toLocaleDateString`)

### File summary
- NEW migration: create `blogs` table + RLS + seed 3 posts
- NEW `src/pages/Blog.tsx`
- NEW `src/pages/BlogDetail.tsx`
- NEW `src/components/admin/AdminBlogs.tsx`
- NEW `src/lib/seo.ts`
- EDIT `src/App.tsx` — add 2 routes
- EDIT `src/pages/Admin.tsx` — register new "Blog" tab

Once approved, I'll switch to default mode and implement everything in one pass, then verify the migration ran and data is visible at `/blog`.
