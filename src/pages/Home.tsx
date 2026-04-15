import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/GlowCard";
import { Sparkles, Users, Brain, Heart, Shield, Zap, Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Social media icons as simple SVG components
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  rating: number | null;
  review: string;
  virtue: string | null;
  image_url: string | null;
}

const Home = () => {
  const [currentReview, setCurrentReview] = useState(0);
  const [reviews, setReviews] = useState<Testimonial[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const virtues = [
    { icon: Brain, name: "Wisdom", color: "text-neon-blue" },
    { icon: Heart, name: "Humanity", color: "text-neon-magenta" },
    { icon: Shield, name: "Courage", color: "text-neon-purple" },
    { icon: Users, name: "Justice", color: "text-neon-blue" },
    { icon: Sparkles, name: "Temperance", color: "text-neon-magenta" },
    { icon: Zap, name: "Transcendence", color: "text-neon-purple" },
  ];

  const plans = [
    {
      name: "Pathfinder",
      price: "Free",
      features: ["1 complimentary meetup", "Virtue quiz access", "Internal profile setup", "Placement in city waitlist"],
    },
    {
      name: "Virtue Circles",
      price: "$100/month",
      features: ["2 Virtue-guided meetups/month", "Customized virtue-based matching", "Venue partner discounts", "Priority access to new features"],
      popular: true,
    },
    {
      name: "SoulMatch AI",
      price: "Coming Soon",
      features: ["Everything in Virtue Circles", "1:1 AI matching", "Deeper compatibility", "Dedicated friendship coach"],
    },
  ];

  const socialLinks = [
    { name: "Instagram", icon: InstagramIcon, url: "#" },
    { name: "YouTube", icon: YouTubeIcon, url: "#" },
    { name: "LinkedIn", icon: LinkedInIcon, url: "#" },
    { name: "Facebook", icon: FacebookIcon, url: "#" },
  ];

  // Fetch testimonials from database
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from("testimonials")
          .select("id, name, location, rating, review, virtue, image_url")
          .eq("is_visible", true)
          .order("display_order", { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          setReviews(data);
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchTestimonials();
  }, []);

  // Auto-rotate reviews
  useEffect(() => {
    if (reviews.length === 0) return;
    const interval = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  const nextReview = () => setCurrentReview((prev) => (prev + 1) % reviews.length);
  const prevReview = () => setCurrentReview((prev) => (prev - 1 + reviews.length) % reviews.length);

  return (
    <div className="min-h-screen relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-secondary/5 to-background" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center space-y-6 mb-12">
            <div className="inline-block">
              <span className="px-4 py-2 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium">
                ✨ Founding Members – 1st Month FREE + 50% Off Next 2 Months
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
              Where Character Creates
              <br />
              <span className="gradient-text">Connection.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Where Aristotle's timeless wisdom meets modern AI to connect you with people who share your values and virtues.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button variant="neon" size="lg" className="text-lg px-8">
                  Join Now
                </Button>
              </Link>
              <Link to="/aristotle">
                <Button variant="hero" size="lg" className="text-lg px-8">
                  Learn About Virtue
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 relative">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {virtues.map((virtue, idx) => (
                <GlowCard
                  key={virtue.name}
                  className="p-6 text-center animate-float"
                  style={{ animationDelay: `${idx * 0.2}s` }}
                >
                  <virtue.icon className={`h-12 w-12 mx-auto mb-3 ${virtue.color}`} />
                  <h3 className="font-display font-bold">{virtue.name}</h3>
                </GlowCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-bold mb-4">
              How <span className="gradient-text">Virtue Matching</span> Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Science-backed matching based on character strengths
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <GlowCard className="p-8">
              <div className="text-4xl font-bold text-primary mb-4">01</div>
              <h3 className="text-2xl font-display font-bold mb-3">Take the Quiz</h3>
              <p className="text-muted-foreground">
                Answer questions based on the VIA Institute's 24 character strengths, rooted in Aristotelian virtue ethics.
              </p>
            </GlowCard>

            <GlowCard className="p-8">
              <div className="text-4xl font-bold text-secondary mb-4">02</div>
              <h3 className="text-2xl font-display font-bold mb-3">AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI analyzes your virtue profile and finds compatible matches who share complementary values.
              </p>
            </GlowCard>

            <GlowCard className="p-8">
              <div className="text-4xl font-bold text-accent mb-4">03</div>
              <h3 className="text-2xl font-display font-bold mb-3">Connect IRL</h3>
              <p className="text-muted-foreground">
                Join curated circle meetups or 1:1 sessions at local venues, building genuine friendships.
              </p>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* Aristotle Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-display font-bold mb-6">
                From Ancient Wisdom to Modern Science
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                2,400 years ago, Aristotle identified that true friendship is based on shared virtue and character. Today, the VIA Institute has scientifically validated 24 character strengths that form the foundation of human excellence.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Virtue Circles combines this ancient wisdom with cutting-edge AI to help you find friends who truly understand and complement your character.
              </p>
              <Link to="/aristotle">
                <Button variant="outline" size="lg">
                  Learn More About Virtue Philosophy
                </Button>
              </Link>
            </div>
            <GlowCard className="p-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-display font-bold gradient-text">
                  The 6 Virtue Clusters
                </h3>
                {virtues.map((virtue) => (
                  <div key={virtue.name} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <virtue.icon className={`h-6 w-6 ${virtue.color}`} />
                    <span className="font-medium">{virtue.name}</span>
                  </div>
                ))}
              </div>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* Review Carousel Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-bold mb-4">
            What Our <span className="gradient-text">Members Say</span>

            </h2>
            <p className="text-xl text-muted-foreground">
              Real stories from our Virtue Circles community
            </p>
          </div>

          <div className="relative">
            {loadingReviews ? (
              <GlowCard className="p-8 md:p-12">
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </GlowCard>
            ) : reviews.length === 0 ? (
              <GlowCard className="p-8 md:p-12 text-center">
                <Quote className="h-12 w-12 text-primary/20 mx-auto mb-4" />
                <p className="text-muted-foreground">No testimonials yet</p>
              </GlowCard>
            ) : (
              <>
                <GlowCard className="p-8 md:p-12">
                  <Quote className="h-12 w-12 text-primary/20 mb-4" />
                  <div className="min-h-[150px] flex flex-col justify-between">
                    <p className="text-xl md:text-2xl text-foreground mb-6 italic">
                      "{reviews[currentReview].review}"
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {reviews[currentReview].image_url ? (
                          <img
                            src={reviews[currentReview].image_url}
                            alt={reviews[currentReview].name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">
                              {reviews[currentReview].name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{reviews[currentReview].name}</p>
                          <p className="text-sm text-muted-foreground">{reviews[currentReview].location}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(reviews[currentReview].rating || 5)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                        ))}
                      </div>
                    </div>
                  </div>
                </GlowCard>

                {/* Navigation arrows */}
                <div className="flex justify-center gap-4 mt-6">
                  <Button variant="outline" size="icon" onClick={prevReview}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-2">
                    {reviews.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentReview(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentReview ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <Button variant="outline" size="icon" onClick={nextReview}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </>
            )}

            {/* Link to Circle Stories */}
            <div className="text-center mt-8">
              <Link to="/circle-stories">
                <Button variant="ghost" className="text-primary hover:text-primary/80">
                  See more stories and photos →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Plans */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-bold mb-4">
              Choose Your <span className="gradient-text">Path</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you're ready
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <GlowCard
                key={plan.name}
                className={`p-8 ${plan.popular ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <div className="text-center mb-4">
                    <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-display font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold mb-6 gradient-text">{plan.price}</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Sparkles className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to={plan.price === "Coming Soon" ? "/soulmatch" : "/plans"}>
                  <Button
                    variant={plan.popular ? "neon" : "outline"}
                    className="w-full"
                    disabled={plan.price === "Coming Soon"}
                  >
                    {plan.price === "Coming Soon" ? "Join Waitlist" : "Get Started"}
                  </Button>
                </Link>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <GlowCard className="p-12">
            <h2 className="text-4xl font-display font-bold mb-6">
              Ready to Join Your <span className="gradient-text">Virtue Circle</span>?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands discovering genuine friendships through shared values
            </p>
            <Link to="/auth">
              <Button variant="neon" size="lg" className="text-lg px-12">
                Join Now
              </Button>
            </Link>

            {/* Social Media Links */}
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-muted-foreground mb-4">Follow us on social media</p>
              <div className="flex justify-center gap-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label={social.name}
                  >
                    <social.icon />
                  </a>
                ))}
              </div>
            </div>
          </GlowCard>
        </div>
      </section>
    </div>
  );
};

export default Home;
