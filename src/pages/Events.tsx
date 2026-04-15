import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  status: string | null;
  image_url: string | null;
}

const Events = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, event_date, status, image_url")
        .in("status", ["upcoming", "active"])
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display font-bold mb-4">
            Upcoming <span className="gradient-text">Circles</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Intimate gatherings matched to your virtue profile. Sign up to be placed in your circle.
          </p>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <GlowCard className="p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-display font-bold mb-4">No Circles Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Check back soon! We're forming new circles for our community.
            </p>
            <Button variant="neon" size="lg" onClick={() => navigate("/auth")}>
              Sign Up to Join
            </Button>
          </GlowCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <GlowCard key={event.id} className="overflow-hidden group flex flex-col">
                {/* Event Image */}
                <div className="relative h-56 overflow-hidden flex-shrink-0">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center">
                      <Sparkles className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                </div>

                {/* Event Content */}
                <div className="p-6 -mt-16 relative z-10 flex flex-col flex-1">
                  <h3 className="text-xl font-display font-bold mb-2 line-clamp-2">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {event.description}
                    </p>
                  )}

                  <div className="mt-auto">
                    <Button
                      variant="neon"
                      className="w-full"
                      onClick={() => navigate(user ? "/dashboard" : "/auth")}
                    >
                      Join Now
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Sign up to be matched to your Circle
                    </p>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
