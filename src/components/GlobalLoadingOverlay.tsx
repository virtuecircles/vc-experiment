import { useEffect, useState } from "react";

interface GlobalLoadingOverlayProps {
  isLoading: boolean;
}

export const GlobalLoadingOverlay = ({ isLoading }: GlobalLoadingOverlayProps) => {
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    if (isLoading) {
      // Only show after 300ms to prevent flicker
      showTimer = setTimeout(() => {
        setShouldRender(true);
        // Small delay to allow mount before fade-in
        requestAnimationFrame(() => setVisible(true));
      }, 300);
    } else {
      // Fade out first, then unmount
      setVisible(false);
      hideTimer = setTimeout(() => setShouldRender(false), 300);
    }

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated pulse ring */}
        <div className="relative flex items-center justify-center w-16 h-16">
          <span className="absolute inset-0 rounded-full border border-primary/40 animate-[thinking-ping_2s_ease-in-out_infinite]" />
          <span className="absolute inset-2 rounded-full border border-secondary/30 animate-[thinking-ping_2s_ease-in-out_0.5s_infinite]" />
          <span className="w-3 h-3 rounded-full bg-primary/80 animate-[thinking-pulse_1.5s_ease-in-out_infinite]" />
        </div>

        {/* Animated text */}
        <p
          className="text-lg font-display font-medium tracking-[0.15em] text-foreground/90"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <ThinkingDots />
        </p>

        <span className="sr-only">Loading content, please wait</span>
      </div>
    </div>
  );
};

/** Cycles: Thinking. → Thinking.. → Thinking… */
const ThinkingDots = () => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span>
      Thinking<span className="inline-block w-[1.2em] text-left">{".".repeat(dotCount)}</span>
    </span>
  );
};

export default GlobalLoadingOverlay;
