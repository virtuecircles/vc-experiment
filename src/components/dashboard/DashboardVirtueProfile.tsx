import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Sparkles, Info, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { likertQuestions } from "@/data/quizQuestions";

interface VirtueData {
  primary_virtue: string | null;
  secondary_virtue: string | null;
  virtue_scores: Record<string, any> | null;
}

interface DashboardVirtueProfileProps {
  virtueData: VirtueData | null;
  quizAttemptCount?: number;
  manuallyAssigned?: boolean;
}

// 6 Primary Virtue Clusters with their character strengths
const virtueDescriptions: Record<string, { description: string; strengths: string[] }> = {
  Wisdom: {
    description: "You value knowledge, creativity, and sound judgment. You seek truth and understanding.",
    strengths: ["Creativity", "Curiosity", "Judgment", "Love of Learning", "Perspective"],
  },
  Courage: {
    description: "You demonstrate emotional strengths involving the exercise of will to accomplish goals.",
    strengths: ["Bravery", "Perseverance", "Honesty", "Zest"],
  },
  Humanity: {
    description: "You excel in interpersonal strengths that involve caring for others and building connections.",
    strengths: ["Love", "Kindness", "Social Intelligence"],
  },
  Justice: {
    description: "You embody civic strengths that underlie healthy community life and fairness.",
    strengths: ["Teamwork", "Fairness", "Leadership"],
  },
  Temperance: {
    description: "You protect against excess and promote balance in life.",
    strengths: ["Forgiveness", "Humility", "Prudence", "Self-Regulation"],
  },
  Transcendence: {
    description: "You forge connections to the larger universe and provide meaning in life.",
    strengths: ["Appreciation of Beauty", "Gratitude", "Hope", "Humor", "Spirituality"],
  },
};

const virtueColors: Record<string, string> = {
  Wisdom: "from-neon-blue to-primary",
  Courage: "from-accent to-secondary",
  Humanity: "from-neon-magenta to-accent",
  Justice: "from-primary to-neon-blue",
  Temperance: "from-secondary to-neon-purple",
  Transcendence: "from-neon-purple to-neon-magenta",
};

const virtueIcons: Record<string, string> = {
  Transcendence: "✨",
  Justice: "⚖️",
  Humanity: "❤️",
  Temperance: "🏛️",
  Wisdom: "🦉",
  Courage: "🔥",
};

const strengthColors: Record<string, string> = {
  Creativity: "bg-blue-500",
  Curiosity: "bg-blue-400",
  Judgment: "bg-blue-600",
  "Love of Learning": "bg-blue-300",
  Perspective: "bg-blue-700",
  Bravery: "bg-orange-500",
  Perseverance: "bg-orange-400",
  Honesty: "bg-orange-600",
  Zest: "bg-orange-300",
  Love: "bg-pink-500",
  Kindness: "bg-pink-400",
  "Social Intelligence": "bg-pink-600",
  Teamwork: "bg-indigo-500",
  Fairness: "bg-indigo-400",
  Leadership: "bg-indigo-600",
  Forgiveness: "bg-green-500",
  Humility: "bg-green-400",
  Prudence: "bg-green-600",
  "Self-Regulation": "bg-green-300",
  "Appreciation of Beauty": "bg-purple-500",
  Gratitude: "bg-purple-400",
  Hope: "bg-purple-600",
  Humor: "bg-purple-300",
  Spirituality: "bg-purple-700",
};

export const DashboardVirtueProfile = ({ virtueData, quizAttemptCount = 0, manuallyAssigned = false }: DashboardVirtueProfileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizData, setQuizData] = useState<{
    demographics: Record<string, string> | null;
    likert_responses: Record<string, number> | null;
    open_ended_responses: Record<string, string | string[]> | null;
    completed_at: string | null;
  } | null>(null);
  const [showAllStrengths, setShowAllStrengths] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retakePromptDismissed, setRetakePromptDismissed] = useState(false);

  useEffect(() => {
    if (user) {
      fetchQuizData();
    }
  }, [user]);

  const fetchQuizData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("quiz_progress")
        .select("demographics, likert_responses, open_ended_responses, completed_at")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      setQuizData(data as typeof quizData);
    } catch (error) {
      console.error("Error fetching quiz data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate character strength scores from likert responses
  const calculateStrengthScores = (): Record<string, number> => {
    if (!quizData?.likert_responses) return {};
    const strengthScores: Record<string, number> = {};
    likertQuestions.forEach((question) => {
      const response = quizData.likert_responses?.[question.id];
      if (response !== undefined) {
        if (!strengthScores[question.strength]) {
          strengthScores[question.strength] = 0;
        }
        strengthScores[question.strength] += response;
      }
    });
    return strengthScores;
  };

  // Extract normalized scores — handles nested {normalized_scores} or legacy flat format
  const extractedVirtueScores: Record<string, number> = (() => {
    const vs = virtueData?.virtue_scores;
    if (!vs) return {};
    if (vs.normalized_scores && typeof vs.normalized_scores === "object") {
      return vs.normalized_scores as Record<string, number>;
    }
    const flat: Record<string, number> = {};
    for (const [k, v] of Object.entries(vs)) {
      if (typeof v === "number") flat[k] = v;
    }
    return flat;
  })();

  // Detect balanced profile from stored virtue_scores or explicit primary_virtue flag
  const isBalanced = (() => {
    // Check explicit primary_virtue = 'Balanced' first (set by admin/quiz system)
    if (virtueData?.primary_virtue === 'Balanced') return true;
    // Check explicit flag in virtue_scores
    if (virtueData?.virtue_scores?.is_balanced === true) return true;
    if (virtueData?.virtue_scores?.is_balanced === false) return false;
    // Compute from scores if not explicitly set
    const scores = Object.values(extractedVirtueScores);
    if (scores.length !== 6) return false;
    return (Math.max(...scores) - Math.min(...scores)) <= 5;
  })();

  const sortedVirtueScores = Object.entries(extractedVirtueScores).sort(([, a], [, b]) => b - a);
  const maxVirtueScore = sortedVirtueScores.length > 0 ? sortedVirtueScores[0][1] : 100;

  const strengthScores = calculateStrengthScores();
  const sortedStrengths = Object.entries(strengthScores).sort(([, a], [, b]) => b - a);
  const maxStrengthScore = sortedStrengths.length > 0 ? sortedStrengths[0][1] : 5;

  const quizCompleted = !!(quizData?.completed_at);
  const hasVirtueData = !!(virtueData?.primary_virtue || sortedVirtueScores.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // STATE 2: Quiz not taken
  if (!quizCompleted && !hasVirtueData) {
    return (
      <div className="space-y-6">
        <GlowCard className="p-10 text-center">
          <div className="text-5xl mb-4">🦉</div>
          <h3 className="text-2xl font-display font-bold mb-2">Your Virtue Profile isn't set up yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Complete the Virtue Quiz to discover your primary virtue and unlock your full profile.
          </p>
          <Button variant="neon" size="lg" onClick={() => navigate("/quiz-intro")}>
            Take the Virtue Quiz
          </Button>
        </GlowCard>
      </div>
    );
  }

  // The Philosopher Card (shared for balanced states)
  const PhilosopherCard = () => (
    <GlowCard className="p-6 border-accent/40 bg-gradient-to-br from-accent/5 to-secondary/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">⚖️</div>
        <div>
          <p className="text-sm text-accent/80 font-medium">Virtue Profile</p>
          <p className="text-2xl font-display font-bold text-accent">The Philosopher</p>
          <p className="text-sm text-muted-foreground">Balanced Virtue Profile</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Aristotle believed the truly flourishing person harmonizes all virtues. Your results show equal balance across all six dimensions of character.
      </p>
      <p className="text-xs text-accent/70 italic mb-5">
        "He is happy who lives in accordance with complete virtue." — Aristotle
      </p>
      <div className="grid grid-cols-2 gap-2">
        {sortedVirtueScores.map(([virtue, score]) => (
          <div key={virtue} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{virtueIcons[virtue] || "•"}</span>
            <span className="font-medium">{virtue}</span>
            <span className="ml-auto font-mono text-xs">{score}%</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );

  // STATE 3 & 4: Balanced — show Philosopher card + retake prompt UNLESS admin manually assigned
  if (isBalanced && !retakePromptDismissed && !manuallyAssigned) {
    return (
      <div className="space-y-6">
        <PhilosopherCard />

        {/* Retake Prompt — shown for all balanced users */}
        <GlowCard className="p-6 border-primary/30">
          <h4 className="font-display font-bold text-lg mb-2">🤔 Want a more specific result?</h4>
          <p className="text-sm text-muted-foreground mb-4">
            A perfectly balanced result is rare. For the most accurate virtue match and the best Circle placement,
            we recommend retaking the quiz and answering as honestly and instinctively as possible — there are no right or wrong answers.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="neon" onClick={() => navigate("/quiz?retake=true")}>
              Retake for Accuracy
            </Button>
            <Button variant="outline" onClick={() => setRetakePromptDismissed(true)}>
              Keep These Results
            </Button>
          </div>
          {/* After 2+ attempts show team review note */}
          {quizAttemptCount >= 2 && (
            <p className="text-xs text-muted-foreground mt-4 italic">
              Our team has been notified and will review your profile within 24 to 48 hours.
            </p>
          )}
        </GlowCard>

        {renderFullRanking()}
        {renderStrengths()}
        {renderMatchingNote()}
      </div>
    );
  }

  // Balanced + manually assigned by admin — show Philosopher card, no retake prompt
  if (isBalanced && manuallyAssigned) {
    return (
      <div className="space-y-6">
        <PhilosopherCard />
        {renderFullRanking()}
        {renderStrengths()}
        {renderMatchingNote()}
      </div>
    );
  }

  // Balanced but prompt dismissed — show Philosopher card with team review note
  if (isBalanced && retakePromptDismissed) {
    return (
      <div className="space-y-6">
        <PhilosopherCard />
        <GlowCard className="p-5 border-muted">
          <p className="text-sm text-muted-foreground">
            Your results show a balanced virtue profile. Our team will review your profile to ensure
            you're placed in the Circle that's the best fit for you. We'll be in touch within 24 to 48 hours.
          </p>
        </GlowCard>
        {renderFullRanking()}
        {renderStrengths()}
        {renderMatchingNote()}
      </div>
    );
  }

  // STATE 5: Normal result — existing primary/secondary card layout
  return (
    <div className="space-y-6">
      {/* Primary & Secondary Virtues */}
      <div className="grid gap-4 md:grid-cols-2">
        <GlowCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Primary Virtue</p>
              <p className={`text-2xl font-display font-bold bg-gradient-to-r ${virtueColors[virtueData?.primary_virtue || ""] || "from-primary to-secondary"} bg-clip-text text-transparent`}>
                {virtueData?.primary_virtue || "Not determined"}
              </p>
            </div>
          </div>
          {virtueData?.primary_virtue && virtueDescriptions[virtueData.primary_virtue] && (
            <p className="text-sm text-muted-foreground">
              {virtueDescriptions[virtueData.primary_virtue].description}
            </p>
          )}
        </GlowCard>

        <GlowCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-secondary/20">
              <Sparkles className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Secondary Virtue</p>
              <p className={`text-2xl font-display font-bold bg-gradient-to-r ${virtueColors[virtueData?.secondary_virtue || ""] || "from-secondary to-accent"} bg-clip-text text-transparent`}>
                {virtueData?.secondary_virtue || "Not determined"}
              </p>
            </div>
          </div>
          {virtueData?.secondary_virtue && virtueDescriptions[virtueData.secondary_virtue] && (
            <p className="text-sm text-muted-foreground">
              {virtueDescriptions[virtueData.secondary_virtue].description}
            </p>
          )}
        </GlowCard>
      </div>

      {renderFullRanking()}
      {renderStrengths()}

      {/* Quiz Responses Summary */}
      {quizData?.open_ended_responses && Object.keys(quizData.open_ended_responses).length > 0 && (
        <GlowCard className="p-6">
          <h3 className="text-xl font-display font-bold mb-4">Your Preferences</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {quizData.open_ended_responses.social_preference && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Social Style</p>
                <p className="text-sm">{quizData.open_ended_responses.social_preference as string}</p>
              </div>
            )}
            {quizData.open_ended_responses.interests && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interests</p>
                <p className="text-sm">{quizData.open_ended_responses.interests as string}</p>
              </div>
            )}
            {quizData.open_ended_responses.looking_for && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Looking For</p>
                <p className="text-sm">{quizData.open_ended_responses.looking_for as string}</p>
              </div>
            )}
            {quizData.open_ended_responses.availability && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Availability</p>
                <p className="text-sm">
                  {Array.isArray(quizData.open_ended_responses.availability)
                    ? (quizData.open_ended_responses.availability as string[]).join(", ")
                    : quizData.open_ended_responses.availability as string}
                </p>
              </div>
            )}
          </div>
        </GlowCard>
      )}

      {renderMatchingNote()}
    </div>
  );

  function renderFullRanking() {
    return (
      <GlowCard className="p-6">
        <h3 className="text-xl font-display font-bold mb-4">Virtue Cluster Ranking</h3>
        {sortedVirtueScores.length > 0 ? (
          <div className="space-y-4">
            {sortedVirtueScores.map(([virtue, score], index) => (
              <div key={virtue} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-6">#{index + 1}</span>
                    {virtue}
                  </span>
                  <span className="font-mono text-sm font-bold">{score}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${virtueColors[virtue] || "from-primary to-secondary"} transition-all duration-500`}
                    style={{ width: `${(score / maxVirtueScore) * 100}%` }}
                  />
                </div>
                {virtueDescriptions[virtue] && (
                  <p className="text-xs text-muted-foreground pl-8">
                    Strengths: {virtueDescriptions[virtue].strengths.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Complete the virtue quiz to see your full ranking</p>
          </div>
        )}
      </GlowCard>
    );
  }

  function renderStrengths() {
    return (
      <GlowCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-display font-bold">24 Character Strengths</h3>
          {sortedStrengths.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllStrengths(!showAllStrengths)}
            >
              {showAllStrengths ? (
                <>Show Less <ChevronUp className="ml-1 h-4 w-4" /></>
              ) : (
                <>Show All <ChevronDown className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          )}
        </div>
        {sortedStrengths.length > 0 ? (
          <div className="space-y-3">
            {(showAllStrengths ? sortedStrengths : sortedStrengths.slice(0, 6)).map(([strength, score], index) => (
              <div key={strength} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <span className="text-muted-foreground w-6">#{index + 1}</span>
                    {strength}
                  </span>
                  <span className="font-mono text-xs">{score}/5</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strengthColors[strength] || "bg-primary"} transition-all duration-500`}
                    style={{ width: `${(score / maxStrengthScore) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Complete the virtue quiz to see your character strengths</p>
          </div>
        )}
      </GlowCard>
    );
  }

  function renderMatchingNote() {
    return (
      <GlowCard className="p-6 border-primary/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-display font-bold mb-1">How Your Profile Is Used</h4>
            <p className="text-sm text-muted-foreground">
              Your virtue profile is used to place you into compatible Circles. Members with
              complementary virtue profiles are grouped together to foster meaningful connections
              and balanced discussions. Your primary and secondary virtues influence your Circle
              placement and event matching.
            </p>
          </div>
        </div>
      </GlowCard>
    );
  }
};
