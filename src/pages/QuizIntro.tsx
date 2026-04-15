import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

export default function QuizIntro() {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full flex flex-col items-center text-center gap-8">

        {/* Logo */}
        <img src={logo} alt="Virtue Circles" className="h-16 w-auto" />

        {/* Heading */}
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight">
          Before You Begin
        </h1>

        {/* Body copy */}
        <div className="space-y-4 text-muted-foreground text-base md:text-lg leading-relaxed text-left">
          <p>
            Your answers shape everything — the people you meet, the connections you build, and the
            Circle you belong to. Answer honestly and from the heart, not how you think you should
            answer. There are no right or wrong responses, only your truth.
          </p>
          <p>
            This is your one opportunity to take the Virtue Quiz. Your results will determine your
            Circle placement and the meaningful friendships that follow. Take your time and reflect
            carefully on each question.
          </p>
        </div>

        {/* Checkbox agreement */}
        <div
          className={`
            flex items-start gap-3 w-full rounded-xl border p-4 text-left transition-all duration-300
            ${agreed
              ? "border-primary/60 shadow-[0_0_20px_hsl(var(--glow-primary)/0.35)] bg-primary/5"
              : "border-border bg-card/40"
            }
          `}
        >
          <Checkbox
            id="agree"
            checked={agreed}
            onCheckedChange={(val) => setAgreed(!!val)}
            className={`mt-0.5 shrink-0 transition-all duration-300 ${agreed ? "shadow-[0_0_12px_hsl(var(--glow-primary)/0.6)]" : ""}`}
          />
          <Label
            htmlFor="agree"
            className="text-sm md:text-base text-foreground/80 leading-snug cursor-pointer"
          >
            I understand that my answers should reflect my true self, and that I will only have one
            opportunity to complete this quiz.
          </Label>
        </div>

        {/* CTA button */}
        <Button
          size="lg"
          disabled={!agreed}
          onClick={() => { sessionStorage.setItem("quizIntroAgreed", "true"); navigate("/quiz"); }}
          className={`
            w-full text-base font-semibold py-6 transition-all duration-300
            ${agreed
              ? "bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-[0_0_30px_hsl(var(--glow-primary)/0.45)] hover:shadow-[0_0_45px_hsl(var(--glow-primary)/0.65)] hover:scale-[1.02]"
              : "opacity-40 cursor-not-allowed"
            }
          `}
        >
          Begin My Virtue Journey
        </Button>
      </div>
    </div>
  );
}
