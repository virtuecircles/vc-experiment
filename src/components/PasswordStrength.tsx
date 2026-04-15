import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains number", test: (p) => /[0-9]/.test(p) },
  { label: "Contains special character", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const { strength, passedRequirements } = useMemo(() => {
    const passed = requirements.filter((req) => req.test(password));
    return {
      strength: (passed.length / requirements.length) * 100,
      passedRequirements: passed,
    };
  }, [password]);

  const getStrengthLabel = () => {
    if (strength === 0) return { text: "", color: "" };
    if (strength <= 20) return { text: "Very Weak", color: "text-destructive" };
    if (strength <= 40) return { text: "Weak", color: "text-orange-500" };
    if (strength <= 60) return { text: "Fair", color: "text-yellow-500" };
    if (strength <= 80) return { text: "Strong", color: "text-lime-500" };
    return { text: "Very Strong", color: "text-green-500" };
  };

  const getProgressColor = () => {
    if (strength <= 20) return "bg-destructive";
    if (strength <= 40) return "bg-orange-500";
    if (strength <= 60) return "bg-yellow-500";
    if (strength <= 80) return "bg-lime-500";
    return "bg-green-500";
  };

  const { text, color } = getStrengthLabel();

  if (!password) return null;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password strength</span>
        <span className={`text-sm font-medium ${color}`}>{text}</span>
      </div>
      
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div 
          className={`h-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${strength}%` }}
        />
      </div>

      <ul className="space-y-1">
        {requirements.map((req) => {
          const passed = req.test(password);
          return (
            <li
              key={req.label}
              className={`flex items-center gap-2 text-xs ${
                passed ? "text-green-500" : "text-muted-foreground"
              }`}
            >
              {passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
