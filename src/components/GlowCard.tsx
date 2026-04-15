import { ReactNode, CSSProperties } from "react";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
}

export const GlowCard = ({ children, className, hover = true, style }: GlowCardProps) => {
  return (
    <Card
      className={cn(
        "neon-border bg-card/50 backdrop-blur-sm transition-all duration-300",
        hover && "hover:shadow-[0_0_30px_hsl(var(--glow-primary)/0.4)] hover:scale-105",
        className
      )}
      style={style}
    >
      {children}
    </Card>
  );
};
