import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Star, Quote, Camera, Heart, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface GalleryPhoto {
  id: string;
  image_url: string;
  title: string;
  date_label: string | null;
  category: string;
}

const CircleStories = () => {
  const [activeGallery, setActiveGallery] = useState<string>("all");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);

  // Placeholder reviews - in production these would come from database
  const reviews = [
    {
      id: "1",
      name: "Sarah M.",
      location: "Austin, TX",
      rating: 5,
      review: "Virtue Circles helped me find genuine friends who share my values. After moving to a new city, I finally feel like I belong.",
      virtue: "Humanity",
      avatar: "/placeholder.svg",
    },
    {
      id: "2",
      name: "James K.",
      location: "Houston, TX",
      rating: 5,
      review: "The virtue matching is surprisingly accurate. My circle includes people I would have never met otherwise, but we click instantly.",
      virtue: "Wisdom",
      avatar: "/placeholder.svg",
    },
    {
      id: "3",
      name: "Maria L.",
      location: "Dallas, TX",
      rating: 5,
      review: "I was skeptical at first, but the events are well-organized and the people are genuinely kind. Highly recommend!",
      virtue: "Courage",
      avatar: "/placeholder.svg",
    },
    {
      id: "4",
      name: "David R.",
      location: "San Antonio, TX",
      rating: 5,
      review: "Finding like-minded friends as an adult is hard. Virtue Circles made it effortless. My circle has become my second family.",
      virtue: "Justice",
      avatar: "/placeholder.svg",
    },
    {
      id: "5",
      name: "Emily T.",
      location: "Austin, TX",
      rating: 5,
      review: "The philosophical foundation sets this apart from other apps. These connections feel deeper and more meaningful.",
      virtue: "Transcendence",
      avatar: "/placeholder.svg",
    },
    {
      id: "6",
      name: "Michael P.",
      location: "Houston, TX",
      rating: 5,
      review: "Best investment I've made in my social life. The monthly events are always fun and I've made lifelong friends.",
      virtue: "Temperance",
      avatar: "/placeholder.svg",
    },
  ];

  useEffect(() => {
    const fetchPhotos = async () => {
      setPhotosLoading(true);
      const { data, error } = await (supabase as any)
        .from("gallery_photos")
        .select("id, image_url, title, date_label, category")
        .eq("is_visible", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (!error) {
        setPhotos((data as GalleryPhoto[]) || []);
      }
      setPhotosLoading(false);
    };

    fetchPhotos();
  }, []);

  // Derive categories from actual data
  const availableCategories = Array.from(new Set(photos.map(p => p.category)));
  const categories = [
    { id: "all", label: "All Meetups" },
    ...availableCategories.map(c => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
  ];

  const filteredPhotos = activeGallery === "all"
    ? photos
    : photos.filter(photo => photo.category === activeGallery);

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-display font-bold mb-4">
            Circle <span className="gradient-text">Stories</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real moments and real connections from our Virtue Circles community
          </p>
        </div>

        {/* Photo Gallery Section */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-display font-bold flex items-center gap-3">
              <Camera className="h-8 w-8 text-primary" />
              Event Gallery
            </h2>
          </div>

          {/* Category Filter */}
          {!photosLoading && photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeGallery === cat.id ? "neon" : "outline"}
                  size="sm"
                  onClick={() => setActiveGallery(cat.id)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          )}

          {/* Photo Grid */}
          {photosLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">
              <ImageOff className="h-16 w-16 opacity-20 mb-4" />
              <p className="text-lg font-medium">No photos yet</p>
              <p className="text-sm mt-1">Check back soon for event photos from our community!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredPhotos.map((photo) => (
                <GlowCard key={photo.id} className="overflow-hidden group cursor-pointer">
                  <div className="aspect-square relative">
                    <img
                      src={photo.image_url}
                      alt={photo.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <div>
                        <p className="font-semibold text-foreground">{photo.title}</p>
                        {photo.date_label && <p className="text-sm text-muted-foreground">{photo.date_label}</p>}
                      </div>
                    </div>
                  </div>
                </GlowCard>
              ))}
            </div>
          )}
        </section>

        {/* Customer Reviews Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4 flex items-center justify-center gap-3">
              <Heart className="h-8 w-8 text-primary" />
              Member Reviews
            </h2>
            <p className="text-muted-foreground">
              Hear from our community about their Virtue Circles experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <GlowCard key={review.id} className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={review.avatar}
                    alt={review.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
                  />
                  <div>
                    <h4 className="font-semibold">{review.name}</h4>
                    <p className="text-sm text-muted-foreground">{review.location}</p>
                    <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full mt-1">
                      {review.virtue}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>

                <div className="relative">
                  <Quote className="h-6 w-6 text-primary/20 absolute -top-1 -left-1" />
                  <p className="text-muted-foreground pl-5 italic">
                    "{review.review}"
                  </p>
                </div>
              </GlowCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CircleStories;
