import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/GlowCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { setPageMeta, resetPageMeta } from "@/lib/seo";
import { ArrowLeft, Calendar } from "lucide-react";

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

const BlogDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    (async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, slug, excerpt, content, image_url, created_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(data as BlogPost);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (post) {
      const description =
        post.excerpt?.trim() ||
        post.content.replace(/[#*`>\-]/g, "").replace(/\s+/g, " ").slice(0, 158).trim();
      setPageMeta({
        title: `${post.title} — Virtue Circles Blog`,
        description,
        image: post.image_url ?? undefined,
        canonicalPath: `/blog/${post.slug}`,
      });
    }
    return () => resetPageMeta();
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen container mx-auto px-4 py-16 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-8" />
        <Skeleton className="h-96 w-full mb-8 rounded-lg" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-4 w-32 mb-8" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen container mx-auto px-4 py-16 max-w-2xl text-center">
        <GlowCard className="p-12">
          <h1 className="font-montserrat text-3xl font-bold mb-4">Post not found</h1>
          <p className="text-muted-foreground mb-8">
            The article you're looking for doesn't exist or hasn't been published yet.
          </p>
          <Button onClick={() => navigate("/blog")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
          </Button>
        </GlowCard>
      </div>
    );
  }

  return (
    <article className="min-h-screen container mx-auto px-4 py-12 max-w-4xl">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>

      {post.image_url && (
        <div className="aspect-video w-full overflow-hidden rounded-lg mb-8 neon-border">
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <header className="mb-10">
        <h1 className="font-montserrat text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        </div>
      </header>

      <div className="prose prose-invert max-w-none">
        <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-lg">
          {post.content}
        </div>
      </div>
    </article>
  );
};

export default BlogDetail;
