import { GlowCard } from "@/components/GlowCard";
import ancientWisdomBanner from "@/assets/ancient-wisdom-banner.png";
import { Brain, Heart, Shield, Users, Sparkles, Zap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Aristotle = () => {
  const virtues = [
    {
      icon: Brain,
      name: "Wisdom & Knowledge",
      color: "text-neon-blue",
      strengths: ["Creativity", "Curiosity", "Judgment", "Love of Learning", "Perspective"],
      description: "Cognitive strengths that involve the acquisition and use of knowledge.",
    },
    {
      icon: Heart,
      name: "Humanity",
      color: "text-neon-magenta",
      strengths: ["Kindness", "Love", "Social Intelligence"],
      description: "Interpersonal strengths that involve caring for and befriending others.",
    },
    {
      icon: Shield,
      name: "Courage",
      color: "text-accent",
      strengths: ["Bravery", "Honesty", "Perseverance", "Zest"],
      description: "Emotional strengths involving the exercise of will to accomplish goals.",
    },
    {
      icon: Users,
      name: "Justice",
      color: "text-primary",
      strengths: ["Fairness", "Leadership", "Teamwork"],
      description: "Civic strengths that underlie healthy community life.",
    },
    {
      icon: Sparkles,
      name: "Temperance",
      color: "text-secondary",
      strengths: ["Forgiveness", "Humility", "Prudence", "Self-Regulation"],
      description: "Strengths that protect against excess and promote balance.",
    },
    {
      icon: Zap,
      name: "Transcendence",
      color: "text-neon-purple",
      strengths: ["Appreciation of Beauty", "Gratitude", "Hope", "Humor", "Spirituality"],
      description: "Strengths that forge connections to the larger universe and provide meaning.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Banner with overlaid hero text */}
      <div className="relative w-full overflow-hidden [aspect-ratio:2/1] md:[aspect-ratio:3/1]">
        <img
          src={ancientWisdomBanner}
          alt="From Ancient Wisdom to Modern Science"
          className="w-full h-full object-cover object-center"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
        {/* Text overlay: title top, subtitle bottom */}
        <div className="absolute inset-0 flex flex-col items-center justify-between text-center px-4 py-6 md:py-8">
          <h1 className="text-4xl md:text-6xl font-display font-bold drop-shadow-lg">
            From <span className="gradient-text">Ancient Wisdom</span>
            <br />
            to Modern Science
          </h1>
          <p className="text-base md:text-xl text-foreground/80 max-w-3xl drop-shadow">
            Discover how Aristotle's 2,400-year-old philosophy of virtue and friendship has been
            scientifically validated and powers our matching algorithm
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Aristotle's Philosophy */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <GlowCard className="p-8">
            <h2 className="text-3xl font-display font-bold mb-4">
              Aristotle's Three Types of Friendship
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Friendships of Utility</h3>
                <p className="text-sm text-muted-foreground">
                  Based on mutual benefit. These friendships dissolve when the utility ends.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Friendships of Pleasure</h3>
                <p className="text-sm text-muted-foreground">
                  Based on enjoyment. These fade when the pleasure is gone.
                </p>
              </div>
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <h3 className="font-bold text-lg mb-2 text-primary">Friendships of Virtue</h3>
                <p className="text-sm text-muted-foreground">
                  Based on mutual respect for each other's character. These are lasting and fulfilling - this is what we match for.
                </p>
              </div>
            </div>
          </GlowCard>

          <GlowCard className="p-8">
            <h2 className="text-3xl font-display font-bold mb-4">Why Virtue Matching Works</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Aristotle observed that true friendship requires two people who not only share
                values but also bring out the best in each other through their complementary virtues.
              </p>
              <p>
                Modern psychology has confirmed this: the VIA Institute's 24 character strengths
                (derived from these six virtue clusters) predict friendship satisfaction,
                personal well-being, and life meaning.
              </p>
              <p>
                When you match with someone based on virtue compatibility, you're not just finding
                someone with similar interests - you're finding someone who can help you grow into
                your best self.
              </p>
            </div>
          </GlowCard>
        </div>

        {/* Six Virtue Clusters */}
        <div className="mb-16">
          <h2 className="text-4xl font-display font-bold text-center mb-12">
            The Six <span className="gradient-text">Virtue Clusters</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {virtues.map((virtue) => (
              <GlowCard key={virtue.name} className="p-6">
                <virtue.icon className={`h-12 w-12 ${virtue.color} mb-4`} />
                <h3 className="text-xl font-display font-bold mb-2">{virtue.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{virtue.description}</p>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-muted-foreground mb-2">CHARACTER STRENGTHS:</div>
                  {virtue.strengths.map((strength) => (
                    <div
                      key={strength}
                      className="text-sm bg-muted/50 px-3 py-1 rounded"
                    >
                      {strength}
                    </div>
                  ))}
                </div>
              </GlowCard>
            ))}
          </div>
        </div>

        {/* The Science */}
        <GlowCard className="p-12 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-display font-bold text-center mb-8">
              The Science Behind Virtue Circles
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-display font-bold mb-4">VIA Institute</h3>
                <p className="text-muted-foreground mb-4">
                  The VIA Institute on Character has conducted decades of research validating these
                  24 character strengths across 190 countries. Their science shows that:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Character strengths are stable across time and situations</li>
                  <li>✓ Using signature strengths increases happiness and reduces depression</li>
                  <li>✓ Strength complementarity predicts friendship success</li>
                  <li>✓ Virtue alignment correlates with life satisfaction</li>
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold mb-4">Our AI Matching</h3>
                <p className="text-muted-foreground mb-4">
                  Our AI is built on proven character-strength research and timeless philosophical insights about
                  complementary virtues to create matches that:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Balance similar core values with complementary strengths</li>
                  <li>✓ Account for social preferences and lifestyle compatibility</li>
                  <li>✓ Create groups with natural harmony and growth potential</li>
                  <li>✓ Optimize for both immediate connection and long-term friendship</li>
                </ul>
              </div>
            </div>
          </div>
        </GlowCard>

        {/* CTA */}
        <div className="text-center">
          <GlowCard className="p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-display font-bold mb-4">
              Ready to Find Your <span className="gradient-text">Virtue Circle</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Take our free quiz to discover your virtue profile and see who you're meant to meet
            </p>
            <Link to="/quiz-intro">
              <Button variant="neon" size="lg" className="text-lg px-12">
                Take the Virtue Quiz
              </Button>
            </Link>
          </GlowCard>
        </div>
      </div>
    </div>
  );
};

export default Aristotle;
