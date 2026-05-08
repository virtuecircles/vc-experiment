import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/GlowCard";
import { Sparkles, Brain, Users } from "lucide-react";
import { setPageMeta, resetPageMeta } from "@/lib/seo";

const steps = [
  {
    num: "01",
    icon: Sparkles,
    iconColor: "text-neon-blue",
    heading: "Step 1 — Take the Virtue Quiz (5 Minutes)",
    paragraphs: [
      "You'll answer a short quiz based on the VIA Institute's 24 character strengths — the most scientifically validated framework for understanding human character. Your answers reveal your core virtues: the qualities that define how you see the world and how you show up for the people you care about.",
      "This is not a personality test. It is a character map. And it is the foundation of everything that follows.",
      "Unlike other meetup groups in Austin, we do not match you on what you like to do on weekends. We match you on who you actually are.",
    ],
  },
  {
    num: "02",
    icon: Brain,
    iconColor: "text-neon-magenta",
    heading: "Step 2 — Our AI Finds Your Matches",
    paragraphs: [
      "Once you complete the quiz, our AI analyzes your virtue profile across six clusters: Wisdom, Humanity, Courage, Justice, Temperance, and Transcendence.",
      "It then looks for people in Austin who complement your character — not identical to you, but aligned in the ways that matter most for lasting friendship. Research from the VIA Institute shows that strength complementarity predicts friendship success more reliably than shared hobbies or demographics.",
      "This is what makes Virtue Circles the only AI friendship matching service in Austin. We are not just connecting people who are nearby or available. We are connecting people who are genuinely compatible at the level of character.",
    ],
  },
  {
    num: "03",
    icon: Users,
    iconColor: "text-neon-purple",
    heading: "Step 3 — Join Your Circle and Meet IRL",
    paragraphs: [
      "After matching, you are placed into a curated Virtue Circle — a small group of Austin adults who share your core values. Circles meet monthly at partner venues around the city for guided conversations and genuine connection.",
      "We also offer 1:1 sessions for members who want to go deeper with a specific match before joining a group setting.",
      "These are not networking events. There is no pitch, no awkward mingling, no name-tag energy. These are the kind of social groups for adults in Austin that people have been looking for — where the conversation goes somewhere real from the very first meeting.",
      "If you have been trying to meet new people in Austin and keep ending up with acquaintances instead of actual friends, this is the difference. The matching is different. The people are different. The depth is different.",
    ],
  },
];

const HowItWorks = () => {
  useEffect(() => {
    setPageMeta({
      title: "How AI Friendship Matching Works in Austin | Virtue Circles",
      description:
        "Discover how Virtue Circles uses AI matching to connect Austin adults based on virtue and values — meet people who share your character, not just your calendar.",
      canonicalPath: "/how-it-works",
    });
    return () => resetPageMeta();
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-secondary/5 to-background" />
        <div className="max-w-5xl mx-auto relative z-10 text-center space-y-6">
          <div className="inline-block">
            <span className="px-4 py-2 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium">
              ✨ How Virtue Circles Works
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight">
            How <span className="gradient-text">AI Friendship Matching</span> Works in Austin
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Most social groups in Austin are built around activities. Virtue Circles is built around you — who you are, what you value, and what kind of person you want to grow into. Here is exactly how our AI matching helps adults in Austin find friends based on character, not convenience.
          </p>
          <div className="flex justify-center pt-4">
            <Link to="/quiz-intro">
              <Button variant="neon" size="lg" className="text-lg px-8">
                Take the Free Virtue Quiz
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto space-y-12">
          {steps.map((step, idx) => {
            const reversed = idx % 2 === 1;
            return (
              <div
                key={step.num}
                className={`grid md:grid-cols-5 gap-8 items-center ${
                  reversed ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <GlowCard
                  className="md:col-span-2 p-8 animate-float"
                  style={{ animationDelay: `${idx * 0.2}s` }}
                >
                  <div className="text-6xl font-display font-bold gradient-text mb-4">
                    {step.num}
                  </div>
                  <step.icon className={`h-14 w-14 ${step.iconColor}`} />
                </GlowCard>
                <div className="md:col-span-3 space-y-4">
                  <h2 className="text-2xl md:text-3xl font-display font-bold">
                    {step.heading}
                  </h2>
                  {step.paragraphs.map((p, i) => (
                    <p key={i} className="text-base md:text-lg text-muted-foreground leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why This Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <GlowCard className="p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-center">
              Why <span className="gradient-text">This Works</span>
            </h2>
            <div className="space-y-5">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Aristotle identified over 2,400 years ago that true friendship — the kind worth having — is built on shared virtue, not shared convenience. Modern psychology has confirmed it. When you connect with someone who complements your character, you do not just enjoy their company. You grow because of it.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Virtue Circles brings this into the present. We have built the first AI-matched, virtue-based social network for adults in Austin. You will not find this anywhere else — not on Meetup, not on Bumble BFF, not at a bar in East Austin.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                If you are ready to find friends in Austin who actually get you, the quiz is free and takes five minutes.
              </p>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <GlowCard className="p-10 md:p-14 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Ready to Meet Your <span className="gradient-text">People</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Five minutes. No cost. A whole new way to find friends in Austin.
            </p>
            <Link to="/quiz-intro">
              <Button variant="neon" size="lg" className="text-lg px-10">
                Take the Free Virtue Quiz
              </Button>
            </Link>
          </GlowCard>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
