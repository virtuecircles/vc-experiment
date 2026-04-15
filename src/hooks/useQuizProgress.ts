import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DemographicData } from "@/types/quiz";
import type { Json } from "@/integrations/supabase/types";

interface QuizProgressData {
  currentStep: number;
  demographics: DemographicData;
  likertResponses: Record<number, number>;
  openEndedResponses: Record<string, string | string[]>;
  completedAt: string | null;
}

export const useQuizProgress = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<QuizProgressData | null>(null);

  // Load progress from database
  useEffect(() => {
    const loadProgress = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("quiz_progress")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading quiz progress:", error);
      } else if (data) {
        const demographics = data.demographics as unknown as DemographicData | null;
        const likertResponses = data.likert_responses as unknown as Record<number, number> | null;
        const openEndedResponses = data.open_ended_responses as unknown as Record<string, string | string[]> | null;
        
        setProgress({
          currentStep: data.current_step,
          demographics: demographics || {
            firstName: "",
            lastName: "",
            phone: "",
            address: "",
            city: "",
            state: "",
            zipCode: "",
            email: user.email || "",
            dateOfBirth: "",
            sex: "",
            orientation: "",
            occupation: "",
            annualIncome: "",
          },
          likertResponses: likertResponses || {},
          openEndedResponses: openEndedResponses || {},
          completedAt: data.completed_at,
        });
      }
      setLoading(false);
    };

    loadProgress();
  }, [user]);

  // Save progress to database
  const saveProgress = useCallback(
    async (
      currentStep: number,
      demographics: DemographicData,
      likertResponses: Record<number, number>,
      openEndedResponses: Record<string, string | string[]>,
      completedAt?: string
    ) => {
      if (!user) return;

      const { error } = await supabase
        .from("quiz_progress")
        .update({
          current_step: currentStep,
          demographics: demographics as unknown as Json,
          likert_responses: likertResponses as unknown as Json,
          open_ended_responses: openEndedResponses as unknown as Json,
          completed_at: completedAt || null,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving quiz progress:", error);
      }
    },
    [user]
  );

  return { loading, progress, saveProgress };
};
