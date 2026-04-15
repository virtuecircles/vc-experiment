import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DashboardRetestProps {
  userId: string;
}

export const DashboardRetest = ({ userId }: DashboardRetestProps) => {
  const navigate = useNavigate();
  const [canRetest, setCanRetest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRetestPermission();
  }, [userId]);

  const checkRetestPermission = async () => {
    try {
      const { data, error } = await supabase
        .rpc('can_user_retest', { user_uuid: userId });

      if (error) throw error;
      setCanRetest(data || false);
    } catch (error) {
      console.error("Error checking retest permission:", error);
      setCanRetest(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRetest = async () => {
    // Clear previous quiz progress so user starts fresh from step 1
    try {
      await supabase
        .from("quiz_progress")
        .update({
          current_step: 1,
          completed_at: null,
          demographics: {},
          likert_responses: {},
          open_ended_responses: {},
        })
        .eq("id", userId);
    } catch (err) {
      console.error("Error clearing quiz progress:", err);
    }
    navigate("/quiz");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!canRetest) {
    return (
      <GlowCard className="p-8">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-display font-bold mb-2">Retesting Not Available</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Retesting is currently not available. You'll be notified when it's enabled by an administrator.
          </p>
        </div>
      </GlowCard>
    );
  }

  return (
    <div className="space-y-6">
      <GlowCard className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <RefreshCw className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-display font-bold">Retest Your Virtues</h2>
        </div>

        <p className="text-muted-foreground mb-6">
          You have been granted permission to retake the virtue assessment. This allows you 
          to reassess your virtue alignment based on your current perspective and experiences.
        </p>

        <GlowCard className="p-4 bg-amber-500/10 border-amber-500/30 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="font-display font-bold text-amber-500 mb-1">Important Notice</h4>
              <p className="text-sm text-muted-foreground">
                Retesting may update your future group and match assignments. Your new results 
                will replace your previous virtue profile and will be used for all future 
                Circle placements and event matching.
              </p>
            </div>
          </div>
        </GlowCard>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="neon" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Virtue Retest
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Retest</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to retake the virtue quiz? Your new results will replace 
                your current virtue profile and may affect your Circle assignments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleStartRetest}>
                Yes, Start Retest
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </GlowCard>
    </div>
  );
};
