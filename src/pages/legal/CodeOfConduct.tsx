import { GlowCard } from "@/components/GlowCard";
import { Heart, Shield, Users, Sparkles } from "lucide-react";

const CodeOfConduct = () => {
  const principles = [
    {
      icon: Heart,
      title: "Respect & Kindness",
      description: "Treat all members with dignity, empathy, and understanding. We're all here to build genuine friendships.",
    },
    {
      icon: Shield,
      title: "Safety First",
      description: "Look out for each other's wellbeing. Report any concerns to moderators immediately.",
    },
    {
      icon: Users,
      title: "Inclusivity",
      description: "Welcome people of all backgrounds, beliefs, and identities. Our diversity makes us stronger.",
    },
    {
      icon: Sparkles,
      title: "Authenticity",
      description: "Be yourself. Genuine connections come from honest, vulnerable sharing.",
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-display font-bold mb-4 text-center">
          <span className="gradient-text">Code of Conduct</span>
        </h1>
        <p className="text-xl text-muted-foreground text-center mb-12">
          Guidelines for building a community of virtue and authentic friendship
        </p>
        
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {principles.map((principle) => (
            <GlowCard key={principle.title} className="p-6">
              <principle.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">{principle.title}</h3>
              <p className="text-sm text-muted-foreground">{principle.description}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Expected Behavior</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Show up on time for events you've RSVP'd to</li>
              <li>Listen actively and give everyone space to share</li>
              <li>Respect boundaries and personal information</li>
              <li>Provide constructive feedback when appropriate</li>
              <li>Help create a welcoming environment for all</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Unacceptable Behavior</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Harassment, discrimination, or hate speech of any kind</li>
              <li>Unwanted romantic or sexual advances</li>
              <li>Sharing others' private information</li>
              <li>Commercial solicitation or spam</li>
              <li>Intimidation, threats, or aggressive behavior</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Enforcement</h2>
            <p className="text-muted-foreground">
              Violations may result in warnings, temporary suspension, or permanent removal from 
              the platform. Moderators have final discretion on enforcement decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Reporting</h2>
            <p className="text-muted-foreground">
              If you experience or witness a violation, report it immediately through the platform 
              or email{" "}
              <a href="mailto:hello@virtue-circles.com" className="text-primary hover:underline">
                hello@virtue-circles.com
              </a>. All reports are confidential.
            </p>
          </section>
        </GlowCard>
      </div>
    </div>
  );
};

export default CodeOfConduct;
