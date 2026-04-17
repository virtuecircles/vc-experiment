import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/GlowCard";
import { Skeleton } from "@/components/ui/skeleton";
import { setPageMeta, resetPageMeta } from "@/lib/seo";
import { Calendar } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  created_at: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const deriveExcerpt = (post: BlogPost) =>
  post.excerpt?.trim() ||
  post.content.replace(/[#*`>\-]/g, "").replace(/\s+/g, " ").slice(0, 160).trim() + "…";

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({
      title: "Blog — Insights on Virtue, Character & Friendship",
      description:
        "Stories and ideas on building deeper friendships through character, wisdom, and the classical virtues.",
      canonicalPath: "/blog",
    });
    return () => resetPageMeta();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, slug, excerpt, content, image_url, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (!error && data) setPosts(data as BlogPost[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen container mx-auto px-4 py-16">
      <header className="text-center mb-12 max-w-3xl mx-auto">
        <h1 className="font-montserrat text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Insights & Stories
        </h1>
        <p className="text-muted-foreground text-lg">
          Reflections on virtue, character, and the friendships that make a life worth living.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-96 w-full rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <GlowCard className="p-12 text-center">
          <p className="text-muted-foreground">No blog posts yet. Check back soon.</p>
        </GlowCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            >
              <GlowCard className="h-full overflow-hidden flex flex-col">
                {post.image_url && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="font-montserrat text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4 flex-1 line-clamp-3">
                    {deriveExcerpt(post)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                  </div>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blog;
