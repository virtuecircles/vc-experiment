import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/GlowCard";
import { QuizResults as QuizResultsType } from "@/types/quiz";
import { Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip
} from "recharts";

const virtueIcons: Record<string, string> = {
  Transcendence: "✨",
  Justice: "⚖️",
  Humanity: "❤️",
  Temperance: "🏛️",
  Wisdom: "🦉",
  Courage: "🔥",
};

const QuizResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<QuizResultsType | null>(null);

  useEffect(() => {
    const savedResults = localStorage.getItem("quizResults");
    if (!savedResults) {
      toast.error("No quiz results found. Please take the quiz first.");
      navigate("/quiz");
      return;
    }
    setResults(JSON.parse(savedResults));
  }, [navigate]);

  if (!results) {
    return null;
  }

  const virtueDescriptions: Record<string, string> = {
    Wisdom: "You value knowledge, creativity, and sound judgment. You seek truth and understanding.",
    Humanity: "You excel in interpersonal strengths that involve caring for others and building connections.",
    Courage: "You demonstrate emotional strengths involving the exercise of will to accomplish goals.",
    Justice: "You embody civic strengths that underlie healthy community life and fairness.",
    Temperance: "You protect against excess and promote balance in life.",
    Transcendence: "You forge connections to the larger universe and provide meaning in life.",
  };

  const virtueColors: Record<string, string> = {
    Wisdom: "from-neon-blue to-primary",
    Humanity: "from-neon-magenta to-accent",
    Courage: "from-accent to-secondary",
    Justice: "from-primary to-neon-blue",
    Temperance: "from-secondary to-neon-purple",
    Transcendence: "from-neon-purple to-neon-magenta",
  };

  // Detect balanced profile: all 6 normalized scores within 5 points of each other
  const normalizedValues = results.normalizedScores
    ? Object.values(results.normalizedScores)
    : [];
  const isBalanced =
    normalizedValues.length === 6 &&
    Math.max(...normalizedValues) - Math.min(...normalizedValues) <= 5;

  // Radar chart data
  const radarData = results.normalizedScores
    ? [
        { virtue: "Courage", score: results.normalizedScores.Courage ?? 0 },
        { virtue: "Humanity", score: results.normalizedScores.Humanity ?? 0 },
        { virtue: "Justice", score: results.normalizedScores.Justice ?? 0 },
        { virtue: "Temperance", score: results.normalizedScores.Temperance ?? 0 },
        { virtue: "Transcendence", score: results.normalizedScores.Transcendence ?? 0 },
        { virtue: "Wisdom", score: results.normalizedScores.Wisdom ?? 0 },
      ]
    : [];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <Sparkles className="h-16 w-16 text-accent animate-float" />
          </div>
          <h1 className="text-5xl font-display font-bold mb-4">
            Your <span className="gradient-text">Virtue Profile</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Based on your responses, here's your unique character strength profile
          </p>
        </div>

        {/* Primary & Secondary Virtues OR Balanced Philosopher Card */}
        {isBalanced ? (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(160,70,207,0.15))",
              border: "1px solid rgba(212,175,55,0.5)",
              borderRadius: "16px",
              padding: "32px",
              textAlign: "center",
              marginBottom: "24px",
              boxShadow: "0 0 32px rgba(212,175,55,0.2)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚖️</div>
            <h2
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#D4AF37",
                marginBottom: "8px",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              The Philosopher
            </h2>
            <div
              style={{
                display: "inline-block",
                background: "rgba(212,175,55,0.2)",
                border: "1px solid rgba(212,175,55,0.6)",
                borderRadius: "20px",
                padding: "4px 16px",
                fontSize: "12px",
                color: "#D4AF37",
                fontWeight: 600,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              Balanced Virtue Profile
            </div>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.7,
                maxWidth: "480px",
                margin: "0 auto 20px auto",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Aristotle believed the truly flourishing person doesn't excel in just one virtue —
              they harmonize all of them. You are rare. Your character is defined not by a single
              strength, but by a deep and balanced wisdom across all dimensions of virtue.
            </p>
            <p
              style={{
                fontSize: "14px",
                color: "#D4AF37",
                fontStyle: "italic",
                opacity: 0.9,
              }}
            >
              "He is happy who lives in accordance with complete virtue." — Aristotle
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "8px",
                marginTop: "24px",
              }}
            >
              {results.allVirtues?.map((v) => (
                <span
                  key={v.virtue}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "20px",
                    padding: "6px 14px",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {virtueIcons[v.virtue]} {v.virtue} · {v.score}%
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <GlowCard className="p-8">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">PRIMARY VIRTUE</div>
                <h2
                  className={`text-4xl font-display font-bold mb-4 bg-gradient-to-r ${
                    virtueColors[results.primaryVirtue]
                  } bg-clip-text text-transparent`}
                >
                  {results.primaryVirtue}
                </h2>
                <p className="text-muted-foreground">
                  {virtueDescriptions[results.primaryVirtue]}
                </p>
              </div>
            </GlowCard>

            <GlowCard className="p-8">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">SECONDARY VIRTUE</div>
                <h2
                  className={`text-4xl font-display font-bold mb-4 bg-gradient-to-r ${
                    virtueColors[results.secondaryVirtue]
                  } bg-clip-text text-transparent`}
                >
                  {results.secondaryVirtue}
                </h2>
                <p className="text-muted-foreground">
                  {virtueDescriptions[results.secondaryVirtue]}
                </p>
              </div>
            </GlowCard>
          </div>
        )}

        {/* Tie / Balanced notification */}
        {isBalanced ? (
          <GlowCard className="p-6 mb-6 text-center">
            <p className="text-muted-foreground italic text-sm">
              You embody all six virtues in equal harmony — the rarest profile on Virtue Circles.
            </p>
          </GlowCard>
        ) : (
          results.tiedVirtues && results.tiedVirtues.length > 1 && (
            <GlowCard className="p-6 mb-6 text-center">
              <p className="text-muted-foreground">
                You are equally balanced in{" "}
                <span className="font-semibold text-foreground">
                  {results.tiedVirtues.join(" and ")}
                </span>
              </p>
            </GlowCard>
          )
        )}

        {/* Virtue Scores Visualization */}
        <GlowCard className="p-8 mb-12">
          <h3 className="text-2xl font-display font-bold mb-6 text-center">
            Your Complete Virtue Spectrum
          </h3>
          <div className="space-y-4">
            {(results.allVirtues
              ? results.allVirtues.map(rv => [rv.virtue, rv.score] as [string, number])
              : Object.entries(results.virtueScores).sort((a, b) => b[1] - a[1])
            ).map(([virtue, score]) => (
              <div key={virtue}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{virtue}</span>
                  <span className="text-muted-foreground">{score}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${virtueColors[virtue]} transition-all duration-1000`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Radar Chart */}
        {radarData.length > 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: "12px",
              padding: "24px",
              border: isBalanced
                ? "1px solid rgba(212,175,55,0.5)"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: isBalanced
                ? "0 0 28px rgba(212,175,55,0.25)"
                : "none",
              marginBottom: "48px",
            }}
          >
            <h3
              style={{
                textAlign: "center",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "8px",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Virtue Balance Visualization
            </h3>
            {isBalanced && (
              <p
                style={{
                  textAlign: "center",
                  color: "#D4AF37",
                  fontSize: "13px",
                  fontStyle: "italic",
                  marginBottom: "16px",
                  opacity: 0.9,
                }}
              >
                Your chart forms a perfect hexagon — the rarest virtue profile.
              </p>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                <PolarGrid stroke="rgba(255,255,255,0.12)" gridType="polygon" />
                <PolarAngleAxis
                  dataKey="virtue"
                  tick={{
                    fill: "#ffffff",
                    fontSize: 12,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 500,
                  }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Virtue Score"
                  dataKey="score"
                  stroke={isBalanced ? "#D4AF37" : "#A046CF"}
                  fill={isBalanced ? "#D4AF37" : "#A046CF"}
                  fillOpacity={0.35}
                  strokeWidth={2}
                  label={({ x, y, value }: { x: number; y: number; value: number }) => (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize={11}
                      fontFamily="Inter, sans-serif"
                    >
                      {value}%
                    </text>
                  )}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Score"]}
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid #A046CF",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "13px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Go to Dashboard / Payment CTA */}
        {(() => {
          const pendingPlan = sessionStorage.getItem("selectedPlan");
          const pendingPromo = sessionStorage.getItem("selectedPromoCode");
          const isFoundingOffer = pendingPromo?.toUpperCase() === "FOUNDING100";

          if (pendingPlan && isFoundingOffer) {
            return (
              <div className="mb-8 space-y-4">
                <GlowCard className="p-6 text-center" style={{ background: "linear-gradient(135deg, rgba(160,70,207,0.15), rgba(212,175,55,0.1))", borderColor: "rgba(212,175,55,0.4)" }}>
                  <div className="inline-block px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-bold mb-3 tracking-wider">
                    🏛️ FOUNDING MEMBER OFFER RESERVED
                  </div>
                  <h3 className="text-xl font-display font-bold mb-1">Your virtue profile is ready! 🎉</h3>
                  <p className="text-muted-foreground text-sm mb-5">
                    You have a special founding offer waiting. Choose how you'd like to join:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/plans">
                      <Button variant="neon" size="lg" className="w-full sm:w-auto">
                        🏛️ Claim Founding Offer – 1st Month FREE
                      </Button>
                    </Link>
                    <Link to="/plans" onClick={() => { sessionStorage.removeItem("selectedPromoCode"); sessionStorage.setItem("selectedPlan", "virtue_circles"); }}>
                      <Button variant="outline" size="lg" className="w-full sm:w-auto">
                        Subscribe at Full Price – $100/mo
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Founding offer: Month 1 FREE · Months 2–3 at $50/mo · Month 4+ at $100/mo
                  </p>
                </GlowCard>
              </div>
            );
          }

          if (pendingPlan && !isFoundingOffer) {
            return (
              <div className="mb-8">
                <GlowCard className="p-6 text-center bg-primary/10 border-primary/30">
                  <h3 className="text-xl font-display font-bold mb-2">Your profile is ready! 🎉</h3>
                  <p className="text-muted-foreground mb-5">
                    Continue to complete your membership payment
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/plans">
                      <Button variant="neon" size="lg" className="w-full sm:w-auto">
                        Start Membership – $100/mo
                      </Button>
                    </Link>
                    <Link to="/plans" onClick={() => { sessionStorage.setItem("selectedPlan", "founding_100"); sessionStorage.setItem("selectedPromoCode", "FOUNDING100"); }}>
                      <Button variant="outline" size="lg" className="w-full sm:w-auto">
                        🏛️ Or Claim Founding Offer
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Founding offer: Month 1 FREE · Months 2–3 at $50/mo · Only 96 spots left
                  </p>
                </GlowCard>
              </div>
            );
          }

          return (
            <div className="mb-8">
              <GlowCard className="p-6 text-center bg-primary/10 border-primary/30">
                <h3 className="text-xl font-display font-bold mb-2">Your profile is ready!</h3>
                <p className="text-muted-foreground mb-4">
                  Access your personalized dashboard to explore events, circles, and more
                </p>
                <Link to="/dashboard">
                  <Button variant="neon" size="lg">
                    Go to My Dashboard
                  </Button>
                </Link>
              </GlowCard>
            </div>
          );
        })()}

        {/* Next Steps */}
        <div className="grid md:grid-cols-2 gap-6">
          <GlowCard className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-display font-bold mb-4">Join Virtue Circles</h3>
            <p className="text-muted-foreground mb-6">
              Get matched with 4-6 people who complement your virtue profile for monthly circle meetups
            </p>
            <Link to="/plans">
              <Button variant="neon" className="w-full">
                View Plans
              </Button>
            </Link>
          </GlowCard>

          <GlowCard className="p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-accent" />
            <h3 className="text-2xl font-display font-bold mb-4">Join SoulMatch AI Waitlist</h3>
            <p className="text-muted-foreground mb-6">
              Get early access to our 1:1 AI matching for deeper, more personalized friendships
            </p>
            <Link to="/soulmatch">
              <Button variant="outline" className="w-full">
                Join Waitlist
              </Button>
            </Link>
          </GlowCard>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
