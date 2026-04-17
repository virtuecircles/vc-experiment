import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GlowCard } from "@/components/GlowCard";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface BlogRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const blankForm = {
  id: "",
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  image_url: "",
  is_published: true,
};

export const AdminBlogs = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load blogs", description: error.message, variant: "destructive" });
    } else {
      setPosts((data ?? []) as BlogRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const openNew = () => {
    setForm(blankForm);
    setSlugTouched(false);
    setOpen(true);
  };

  const openEdit = (p: BlogRow) => {
    setForm({
      id: p.id,
      title: p.title,
      slug: p.slug,
      content: p.content,
      excerpt: p.excerpt ?? "",
      image_url: p.image_url ?? "",
      is_published: p.is_published,
    });
    setSlugTouched(true);
    setOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setForm((f) => ({
      ...f,
      title: val,
      slug: slugTouched ? f.slug : slugify(val),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim() || !form.slug.trim()) {
      toast({ title: "Missing fields", description: "Title, slug, and content are required.", variant: "destructive" });
      return;
    }
    const cleanSlug = slugify(form.slug);
    if (!cleanSlug) {
      toast({ title: "Invalid slug", description: "Slug must contain letters or numbers.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: cleanSlug,
      content: form.content.trim(),
      excerpt: form.excerpt.trim() || null,
      image_url: form.image_url.trim() || null,
      is_published: form.is_published,
    };

    const { error } = form.id
      ? await supabase.from("blogs").update(payload).eq("id", form.id)
      : await supabase.from("blogs").insert(payload);

    setSaving(false);

    if (error) {
      toast({
        title: "Save failed",
        description: error.message.includes("duplicate") ? "Slug already in use." : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: form.id ? "Post updated" : "Post created" });
    setOpen(false);
    fetchPosts();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("blogs").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post deleted" });
      fetchPosts();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-montserrat text-2xl font-bold">Blog Posts</h2>
          <p className="text-sm text-muted-foreground">Manage articles published at /blog</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </div>

      <GlowCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No posts yet. Click "New Post" to create one.
                </TableCell>
              </TableRow>
            ) : (
              posts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.slug}</TableCell>
                  <TableCell>
                    {p.is_published ? (
                      <Badge variant="default">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button asChild variant="ghost" size="icon" title="View">
                        <Link to={`/blog/${p.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(p.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </GlowCard>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Post" : "New Post"}</DialogTitle>
            <DialogDescription>
              Fill in the details. The slug will be used in the URL: /blog/your-slug
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="b-title">Title</Label>
              <Input
                id="b-title"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="How Virtue Builds Real Friendships"
              />
            </div>

            <div>
              <Label htmlFor="b-slug">Slug</Label>
              <Input
                id="b-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                placeholder="virtue-builds-friendships"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL: /blog/{slugify(form.slug) || "your-slug"}
              </p>
            </div>

            <div>
              <Label htmlFor="b-image">Image URL</Label>
              <Input
                id="b-image"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div>
              <Label htmlFor="b-excerpt">Excerpt (optional)</Label>
              <Textarea
                id="b-excerpt"
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                placeholder="Short summary shown on the listing page (auto-generated if blank)"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="b-content">Content</Label>
              <Textarea
                id="b-content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Write the full article here. Line breaks are preserved."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="b-published"
                checked={form.is_published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
              />
              <Label htmlFor="b-published" className="cursor-pointer">
                {form.is_published ? "Published" : "Draft"}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Update Post" : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The post will be removed permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
