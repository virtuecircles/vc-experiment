import { useState, useEffect, useRef } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Quote,
  Plus,
  Edit,
  Trash2,
  Star,
  MapPin,
  Eye,
  EyeOff,
  HelpCircle,
  ShieldAlert,
  ImagePlus,
  X,
  Loader2,
  GripVertical,
} from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  rating: number | null;
  review: string;
  virtue: string | null;
  image_url: string | null;
  is_visible: boolean;
  display_order: number;
  created_at: string;
}

const VIRTUES = ["Wisdom", "Humanity", "Courage", "Justice", "Temperance", "Transcendence"];

export const AdminTestimonials = () => {
  const { toast } = useToast();
  const { isSuperAdmin, isVCManager } = useUserRoles();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    location: "",
    rating: 5,
    review: "",
    virtue: "",
    image_url: "",
    is_visible: true,
  });

  const canManage = isSuperAdmin || isVCManager;

  useEffect(() => {
    if (canManage) {
      fetchTestimonials();
    }
  }, [canManage]);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      toast({
        title: "Error",
        description: "Failed to load testimonials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `testimonials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("testimonial-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("testimonial-images")
        .getPublicUrl(filePath);

      setForm({ ...form, image_url: publicUrl });

      toast({
        title: "✓ Image Uploaded",
        description: "Member photo has been uploaded.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setForm({ ...form, image_url: "" });
  };

  const handleSave = async () => {
    if (!form.name || !form.review) {
      toast({
        title: "Error",
        description: "Name and review are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (selectedTestimonial) {
        const { error } = await supabase
          .from("testimonials")
          .update({
            name: form.name,
            location: form.location || null,
            rating: form.rating,
            review: form.review,
            virtue: form.virtue || null,
            image_url: form.image_url || null,
            is_visible: form.is_visible,
          })
          .eq("id", selectedTestimonial.id);

        if (error) throw error;
        toast({
          title: "✓ Testimonial Updated",
          description: "Changes have been saved.",
        });
      } else {
        const maxOrder = testimonials.length > 0 
          ? Math.max(...testimonials.map(t => t.display_order)) + 1 
          : 0;

        const { error } = await supabase
          .from("testimonials")
          .insert({
            name: form.name,
            location: form.location || null,
            rating: form.rating,
            review: form.review,
            virtue: form.virtue || null,
            image_url: form.image_url || null,
            is_visible: form.is_visible,
            display_order: maxOrder,
          });

        if (error) throw error;
        toast({
          title: "✓ Testimonial Added",
          description: "New testimonial has been created.",
        });
      }

      setShowDialog(false);
      resetForm();
      fetchTestimonials();
    } catch (error) {
      console.error("Error saving testimonial:", error);
      toast({
        title: "Error",
        description: "Failed to save testimonial.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTestimonial) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", selectedTestimonial.id);

      if (error) throw error;

      toast({
        title: "✓ Testimonial Deleted",
        description: "Testimonial has been removed.",
      });

      setShowDeleteDialog(false);
      setSelectedTestimonial(null);
      fetchTestimonials();
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      toast({
        title: "Error",
        description: "Failed to delete testimonial.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (testimonial: Testimonial) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .update({ is_visible: !testimonial.is_visible })
        .eq("id", testimonial.id);

      if (error) throw error;

      toast({
        title: testimonial.is_visible ? "Hidden" : "✓ Visible",
        description: `Testimonial is now ${testimonial.is_visible ? "hidden" : "visible"}.`,
      });

      fetchTestimonials();
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update visibility.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      location: "",
      rating: 5,
      review: "",
      virtue: "",
      image_url: "",
      is_visible: true,
    });
    setSelectedTestimonial(null);
  };

  const openEditDialog = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setForm({
      name: testimonial.name,
      location: testimonial.location || "",
      rating: testimonial.rating || 5,
      review: testimonial.review,
      virtue: testimonial.virtue || "",
      image_url: testimonial.image_url || "",
      is_visible: testimonial.is_visible,
    });
    setShowDialog(true);
  };

  const visibleCount = testimonials.filter(t => t.is_visible).length;

  if (!canManage) {
    return (
      <GlowCard className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-medium">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">
          Only Managers and Super Admins can manage testimonials.
        </p>
      </GlowCard>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-lg">Member Testimonials</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Manage testimonials shown on the homepage. Add member photos to make them more personal.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Testimonial
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <GlowCard className="p-4">
          <p className="text-2xl font-bold">{testimonials.length}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-green-500">{visibleCount}</p>
          <p className="text-sm text-muted-foreground">Visible</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-blue-500">
            {testimonials.filter(t => t.image_url).length}
          </p>
          <p className="text-sm text-muted-foreground">With Photos</p>
        </GlowCard>
      </div>

      {/* Testimonials List */}
      <div className="space-y-3">
        {testimonials.length === 0 ? (
          <GlowCard className="p-8 text-center">
            <Quote className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No Testimonials Yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add testimonials to showcase member experiences.
            </p>
          </GlowCard>
        ) : (
          testimonials.map((testimonial) => (
            <GlowCard key={testimonial.id} className="p-4">
              <div className="flex gap-4">
                {/* Image */}
                <div className="flex-shrink-0">
                  {testimonial.image_url ? (
                    <img
                      src={testimonial.image_url}
                      alt={testimonial.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{testimonial.name}</p>
                    {testimonial.location && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {testimonial.location}
                      </span>
                    )}
                    {!testimonial.is_visible && (
                      <Badge variant="outline" className="text-xs">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {[...Array(testimonial.rating || 5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                      ))}
                    </div>
                    {testimonial.virtue && (
                      <Badge variant="secondary" className="text-xs">
                        {testimonial.virtue}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    "{testimonial.review}"
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleVisibility(testimonial)}
                      >
                        {testimonial.is_visible ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {testimonial.is_visible ? "Hide" : "Show"}
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(testimonial)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTestimonial(testimonial);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </GlowCard>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Quote className="h-5 w-5 text-primary" />
              {selectedTestimonial ? "Edit Testimonial" : "Add Testimonial"}
            </DialogTitle>
            <DialogDescription>
              Add a member testimonial with an optional photo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div>
              <Label>Member Photo (Optional)</Label>
              <div className="mt-2">
                {form.image_url ? (
                  <div className="relative inline-block">
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-primary/20"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Click to upload (max 5MB)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Sarah M."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g., Austin, TX"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rating</Label>
                <Select
                  value={form.rating.toString()}
                  onValueChange={(value) => setForm({ ...form, rating: parseInt(value) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} Star{n > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Virtue</Label>
                <Select
                  value={form.virtue}
                  onValueChange={(value) => setForm({ ...form, virtue: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select virtue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VIRTUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Review *</Label>
              <Textarea
                value={form.review}
                onChange={(e) => setForm({ ...form, review: e.target.value })}
                placeholder="Write the member's testimonial..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label>Visible on Website</Label>
                <p className="text-xs text-muted-foreground">Show this testimonial publicly</p>
              </div>
              <Switch
                checked={form.is_visible}
                onCheckedChange={(checked) => setForm({ ...form, is_visible: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : selectedTestimonial ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Testimonial
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedTestimonial?.name}</strong>'s testimonial?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTestimonial(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
