import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Crown, Sparkles, Zap, Trophy, Heart, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";


interface Testimonial {
  id: string;
  name: string;
  review: string;
  virtue: string | null;
  location: string | null;
  rating: number | null;
  image_url: string | null;
}

const Founding100 = () => {
  const { isSuperAdmin, isVCManager } = useUserRoles();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);

  const isAdminOrManager = isSuperAdmin || isVCManager;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        let query = supabase
          .from('testimonials')
          .select('id, name, review, virtue, location, rating, image_url')
          .order('display_order', { ascending: true });

        // Non-admins only see visible testimonials
        if (!isAdminOrManager) {
          query = query.eq('is_visible', true);
        }

        const { data, error } = await query.limit(6);
        if (error) throw error;
        setTestimonials(data || []);
      } catch (err) {
        console.error('Failed to load testimonials:', err);
      } finally {
        setLoadingTestimonials(false);
      }
    };

    fetchTestimonials();
  }, [isAdminOrManager]);

  const benefits = [
    {
      icon: Crown,
      title: "1st Month FREE",
      description:
        "Your first month of Virtue Circles membership is completely free. Experience the full platform at no cost.",
    },
    {
      icon: Star,
      title: "50% Off Next 2 Months",
      description:
        "After your free month, enjoy 50% off for the next 2 months — just $50/month instead of $100/month.",
    },
    {
      icon: Zap,
      title: "Priority Access",
      description:
        "First access to new features, SoulMatch AI beta, exclusive events, and priority customer support.",
    },
    {
      icon: Trophy,
      title: "Shape the Platform",
      description:
        "Direct line to founders, influence product decisions, and help build the future of friendship matching.",
    },
    {
      icon: Heart,
      title: "Founding Member Events",
      description:
        "Exclusive quarterly events with other founding members and the Virtue Circles team.",
    },
    {
      icon: Sparkles,
      title: "Exclusive Founding Badge",
      description:
        "Display your Founding Member badge on your profile, showing you were an early believer in virtue-based friendship.",
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <Crown className="h-20 w-20 text-accent animate-float" />
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6">
            <span className="gradient-text">Founding Members Offer</span>
          </h1>
          <p className="text-2xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Be among the first members and receive an incredible introductory offer
          </p>
          <div className="inline-flex items-center space-x-4 px-6 py-3 bg-accent/10 border border-accent/30 rounded-full">
            <span className="text-accent font-bold text-lg">Limited Spots Remaining</span>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <GlowCard className="p-8 text-center">
            <div className="text-5xl font-bold gradient-text mb-2">FREE</div>
            <div className="text-sm text-muted-foreground mb-4">1st month</div>
            <div className="text-lg line-through text-muted-foreground">$100/month</div>
            <div className="text-accent font-bold mt-2">Save $100</div>
          </GlowCard>

          <GlowCard className="p-8 text-center">
            <div className="text-5xl font-bold gradient-text mb-2">$50</div>
            <div className="text-sm text-muted-foreground mb-4">per month for months 2 & 3</div>
            <div className="text-lg line-through text-muted-foreground">$100/month</div>
            <div className="text-accent font-bold mt-2">50% Off</div>
          </GlowCard>

          <GlowCard className="p-8 text-center">
            <div className="text-5xl font-bold gradient-text mb-2">$100</div>
            <div className="text-sm text-muted-foreground mb-4">total saved</div>
            <div className="text-lg text-muted-foreground">Then $100/month</div>
            <div className="text-accent font-bold mt-2">Regular pricing after</div>
          </GlowCard>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <h2 className="text-4xl font-display font-bold text-center mb-12">
            Founding Member <span className="gradient-text">Benefits</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <GlowCard key={benefit.title} className="p-6">
                <benefit.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-display font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </GlowCard>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        {(loadingTestimonials || testimonials.length > 0) && (
          <div className="mb-16">
            <h2 className="text-4xl font-display font-bold text-center mb-4">
              What Our Members Say
            </h2>
            {isAdminOrManager && (
              <p className="text-center text-sm text-muted-foreground mb-8">
                Showing all testimonials (including hidden) — manage in Admin → Testimonials
              </p>
            )}
            {!isAdminOrManager && <div className="mb-8" />}

            {loadingTestimonials ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <GlowCard key={i} className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-5/6" />
                      <div className="h-4 bg-muted rounded w-1/2 mt-4" />
                    </div>
                  </GlowCard>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((t) => (
                  <GlowCard key={t.id} className="p-6" hover={false}>
                    <div className="mb-4">
                      <div className="flex text-accent mb-2">
                        {[...Array(t.rating ?? 5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground italic">"{t.review}"</p>
                    </div>
                    <div>
                      <div className="font-bold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[t.virtue, t.location].filter(Boolean).join(' · ') || 'Virtue Circles Member'}
                      </div>
                    </div>
                  </GlowCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <GlowCard className="p-12 text-center bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
          <Crown className="h-16 w-16 mx-auto mb-6 text-accent animate-float" />
          <h2 className="text-4xl font-display font-bold mb-4">
            Ready to Become a <span className="gradient-text">Founding Member</span>?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Claim your 1st month FREE and 50% off the next 2 months. Spots are limited and filling fast.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/plans">
              <Button variant="neon" size="lg" className="text-lg px-12">
                Claim Your Spot Now
              </Button>
            </Link>
            <Link to="/plans">
              <Button variant="outline" size="lg" className="text-lg px-12">
                View All Plans
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            ⏰ Offer ends when all spots are filled
          </p>
        </GlowCard>
      </div>
    </div>
  );
};

export default Founding100;
