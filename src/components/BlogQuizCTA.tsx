import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Floating CTA that invites blog readers to take the Virtue Quiz.
 * - Desktop: pinned to the right side, vertically centered.
 * - Mobile: docked to the bottom-right as a compact card.
 * Fades in after slight scroll; not dismissible.
 */
export const BlogQuizCTA = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed z-40 transition-all duration-500 pointer-events-none",
        // Position: right side desktop, bottom-right mobile
        "right-4 bottom-4 md:right-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2",
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6 md:translate-x-8"
      )}
      aria-hidden={!visible}
    >
      <div className="pointer-events-auto w-[260px] md:w-[240px] rounded-2xl neon-border bg-card/80 backdrop-blur-xl p-5 shadow-[0_0_40px_hsl(var(--glow-primary)/0.35)]">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">
            Free · 5 min
          </span>
        </div>

        <h3 className="font-montserrat text-base font-bold leading-tight mb-1 gradient-text">
          Discover Your Virtue
        </h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Find the friends who actually get you. Take the quiz.
        </p>

        <Button
          asChild
          size="sm"
          className="w-full bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity duration-300 shadow-[0_0_20px_hsl(var(--glow-primary)/0.4)]"
        >
          <Link to="/quiz-intro">Take the Quiz</Link>
        </Button>
      </div>
    </div>
  );
};

export default BlogQuizCTA;
