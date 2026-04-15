import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Upload, Trash2, Pencil, Check, X, ImageOff, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GalleryPhoto {
  id: string;
  image_url: string;
  title: string;
  date_label: string | null;
  category: string;
  display_order: number;
  is_visible: boolean;
  created_at: string;
}

const CATEGORIES = ["meetups", "outdoors", "culture"];

export const AdminGallery = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", date_label: "", category: "" });

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("meetups");
  const [uploadDateLabel, setUploadDateLabel] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("gallery_photos")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading photos", description: error.message, variant: "destructive" });
    } else {
      setPhotos((data as GalleryPhoto[]) || []);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) {
      toast({ title: "Missing fields", description: "Please select a file and enter a title.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const fileName = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, selectedFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(fileName);

      const { error: insertError } = await (supabase as any)
        .from("gallery_photos")
        .insert({
          image_url: urlData.publicUrl,
          title: uploadTitle.trim(),
          date_label: uploadDateLabel.trim() || null,
          category: uploadCategory,
          display_order: photos.length,
        });

      if (insertError) throw insertError;

      toast({ title: "Photo uploaded", description: "Photo added to the gallery." });
      resetUploadForm();
      fetchPhotos();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadTitle("");
    setUploadCategory("meetups");
    setUploadDateLabel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleVisibility = async (photo: GalleryPhoto) => {
    const { error } = await (supabase as any)
      .from("gallery_photos")
      .eq("id", photo.id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_visible: !p.is_visible } : p));
    }
  };

  const startEdit = (photo: GalleryPhoto) => {
    setEditingId(photo.id);
    setEditForm({ title: photo.title, date_label: photo.date_label || "", category: photo.category });
  };

  const saveEdit = async (id: string) => {
    const { error } = await (supabase as any)
      .from("gallery_photos")
      .update({
        title: editForm.title.trim(),
        date_label: editForm.date_label.trim() || null,
        category: editForm.category,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...editForm, date_label: editForm.date_label || null } : p));
      setEditingId(null);
    }
  };

  const deletePhoto = async (photo: GalleryPhoto) => {
    // Extract storage path from URL
    try {
      const url = new URL(photo.image_url);
      const pathParts = url.pathname.split("/event-images/");
      const storagePath = pathParts[1];

      if (storagePath) {
        await supabase.storage.from("event-images").remove([storagePath]);
      }
    } catch {
      // Continue even if storage removal fails
    }

    const { error } = await (supabase as any)
      .from("gallery_photos")
      .eq("id", photo.id);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Photo deleted" });
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Panel */}
      <div className="border border-border rounded-xl p-6 space-y-4 bg-muted/20">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Upload New Photo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="photo-file">Photo File</Label>
              <Input
                id="photo-file"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="photo-title">Event Title *</Label>
              <Input
                id="photo-title"
                placeholder="e.g. Austin Coffee Meetup"
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="photo-date">Date Label</Label>
              <Input
                id="photo-date"
                placeholder="e.g. Jan 2026"
                value={uploadDateLabel}
                onChange={e => setUploadDateLabel(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="photo-category">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg overflow-hidden bg-muted/30 min-h-[200px]">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover max-h-64" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
                <ImageOff className="h-10 w-10 opacity-30" />
                <p className="text-sm">No file selected</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadTitle.trim()}>
            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Upload Photo</>}
          </Button>
          {selectedFile && (
            <Button variant="outline" onClick={resetUploadForm}>Cancel</Button>
          )}
        </div>
      </div>

      {/* Photo Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Gallery Photos ({photos.length})</h3>
          <Button variant="outline" size="sm" onClick={fetchPhotos}>Refresh</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            <ImageOff className="h-12 w-12 opacity-30 mb-3" />
            <p>No photos uploaded yet. Upload your first photo above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="border border-border rounded-xl overflow-hidden bg-card">
                {/* Image */}
                <div className="aspect-video relative">
                  <img
                    src={photo.image_url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${photo.is_visible ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-muted text-muted-foreground"}`}
                    >
                      {photo.is_visible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                </div>

                {/* Info / Edit */}
                <div className="p-3 space-y-2">
                  {editingId === photo.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Title"
                        className="h-8 text-sm"
                      />
                      <Input
                        value={editForm.date_label}
                        onChange={e => setEditForm(f => ({ ...f, date_label: e.target.value }))}
                        placeholder="Date label"
                        className="h-8 text-sm"
                      />
                      <Select value={editForm.category} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 px-2 flex-1" onClick={() => saveEdit(photo.id)}>
                          <Check className="h-3 w-3 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 flex-1" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium text-sm truncate">{photo.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {photo.date_label && <span className="text-xs text-muted-foreground">{photo.date_label}</span>}
                          <Badge variant="outline" className="text-xs capitalize py-0">{photo.category}</Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={photo.is_visible}
                            onCheckedChange={() => toggleVisibility(photo)}
                            className="scale-75"
                          />
                          <span className="text-xs text-muted-foreground">Show</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(photo)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{photo.title}" from the gallery and storage.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePhoto(photo)} className="bg-destructive hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
