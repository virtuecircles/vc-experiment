-- Create blogs table
CREATE TABLE public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  image_url TEXT,
  author_id UUID,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for slug lookups
CREATE INDEX idx_blogs_slug ON public.blogs(slug);
CREATE INDEX idx_blogs_published_created ON public.blogs(is_published, created_at DESC);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anyone can view published blogs"
ON public.blogs
FOR SELECT
USING (is_published = true);

-- Admins can view all (incl. unpublished)
CREATE POLICY "Admins can view all blogs"
ON public.blogs
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));

-- Admins can manage blogs
CREATE POLICY "Admins can insert blogs"
ON public.blogs
FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));

CREATE POLICY "Admins can update blogs"
ON public.blogs
FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));

CREATE POLICY "Admins can delete blogs"
ON public.blogs
FOR DELETE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));

-- Updated_at trigger
CREATE TRIGGER update_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 3 starter posts
INSERT INTO public.blogs (title, slug, excerpt, content, image_url) VALUES
(
  'How Virtue Builds Real Friendships',
  'virtue-builds-friendships',
  'Real friendship isn''t built on convenience or shared hobbies — it''s built on character. Here''s why virtue is the missing ingredient in modern connection.',
  E'Real friendship isn''t built on convenience or shared hobbies. It''s built on character.\n\nFor most of human history, philosophers understood something we''ve forgotten: the depth of a friendship is determined by the virtue of the people in it. Two people of weak character will form a shallow bond, no matter how much time they spend together. Two people of strong character will form a bond that withstands distance, conflict, and time.\n\n## Why Character Matters\n\nWhen you trust someone''s character, you can be honest with them. You can disagree without fear. You can be vulnerable without being exploited. Without character, every interaction becomes a performance — a careful management of impressions designed to keep the other person comfortable.\n\nVirtue removes that performance. It creates a space where two people can actually meet.\n\n## The Four Pillars\n\nThe classical virtues — wisdom, courage, justice, and temperance — aren''t abstract ideals. They''re the daily practices that make someone worth knowing.\n\n- **Wisdom** lets your friend give you advice that''s actually useful.\n- **Courage** lets them tell you the truth when it''s hard.\n- **Justice** lets you trust them with your reputation and your secrets.\n- **Temperance** lets them be a steady presence, not an emotional storm.\n\n## Building It in Practice\n\nYou can''t shortcut character. But you can choose to spend time with people who are working on it — and you can do the work yourself. That''s what real community looks like: a group of people committed to becoming better, together.\n\nThat''s the foundation everything else rests on.',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80'
),
(
  'Why Modern Friendships Feel Empty',
  'modern-friendships-empty',
  'We have more ways to connect than ever — and we''ve never felt more alone. The problem isn''t our technology. It''s what we''ve stopped asking of each other.',
  E'We have more ways to connect than ever before. Group chats, social feeds, video calls, dating apps. And yet loneliness is at an all-time high.\n\nThe problem isn''t the technology. The problem is what we''ve stopped asking of each other.\n\n## The Shift\n\nA generation ago, friendships were forged through shared struggle — neighborhoods, congregations, civic groups, long projects that required showing up week after week. You didn''t pick your friends from a curated feed. You earned them through proximity, repetition, and difficulty.\n\nToday, we treat friendship like a product. We expect it to be convenient, low-friction, and instantly enjoyable. The moment it requires effort, we swipe to the next thing.\n\n## What We''ve Lost\n\nThe deepest friendships have always required three things modern life resists:\n\n1. **Time.** Not minutes — years.\n2. **Conflict.** Real friends fight. Then they repair.\n3. **Stakes.** You have to actually need each other for something.\n\nWithout these, friendship becomes performance. We share highlights instead of struggles. We text instead of speak. We accumulate followers instead of confidants.\n\n## A Different Path\n\nThe answer isn''t to abandon technology. It''s to use it as a doorway, not a destination. Find your people, then meet them in person. Show up consistently. Let it get hard. Let it get real.\n\nThat''s how empty connection becomes something that actually holds you up.',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&q=80'
),
(
  'Aristotle''s Secret to Deep Connections',
  'aristotle-deep-connections',
  '2,400 years ago, Aristotle described three kinds of friendship — and explained why most of ours stay shallow. His framework still holds the answer.',
  E'2,400 years ago, Aristotle wrote about friendship with more clarity than anyone since. In the *Nicomachean Ethics*, he laid out three kinds of friendship — and explained why most never reach their full depth.\n\n## The Three Types\n\n**1. Friendships of Utility.** You''re friends because the relationship is useful. A coworker, a contact, a person who helps you get something done. These end the moment the usefulness ends.\n\n**2. Friendships of Pleasure.** You''re friends because spending time together is fun. Drinking buddies, gym partners, group chat regulars. These end the moment the pleasure fades.\n\n**3. Friendships of Virtue.** You''re friends because you genuinely admire who the other person is — and they admire who you are. You make each other better. These last.\n\n## Why Most Friendships Stop at #1 and #2\n\nThe first two are easy. They don''t require much of you. You can have dozens of them without ever revealing yourself.\n\nThe third requires something harder: actually becoming the kind of person worth being admired for. You have to do the inner work. You have to develop character. You have to be willing to be seen.\n\n## The Secret\n\nHere''s what Aristotle understood that we forget: you can''t shortcut your way into a friendship of virtue. You can''t hack it, optimize it, or manufacture it through clever icebreakers.\n\nIt''s a byproduct.\n\nWhen you commit to becoming a person of wisdom, courage, justice, and temperance — and you spend time with others doing the same — these friendships emerge naturally. They are the reward of a life lived well.\n\nThat''s the secret. It''s not a technique. It''s a way of being.',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80'
);