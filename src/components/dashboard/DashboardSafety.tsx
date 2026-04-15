import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, FileText, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Waiver {
  waiver_type: string;
  signed_at: string | null;
}

interface DashboardSafetyProps {
  userId: string;
}

export const DashboardSafety = ({ userId }: DashboardSafetyProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const requiredWaivers = [
    { type: "liability_waiver", label: "Liability Waiver", link: "/legal/waiver" },
    { type: "code_of_conduct", label: "Code of Conduct", link: "/legal/code-of-conduct" },
  ];

  useEffect(() => {
    fetchWaivers();
  }, [userId]);

  const fetchWaivers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_waivers")
        .select("waiver_type, signed_at")
        .eq("user_id", userId);

      if (error) throw error;
      setWaivers(data || []);
    } catch (error) {
      console.error("Error fetching waivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignWaiver = async (waiverType: string) => {
    if (!acceptedTerms) {
      toast({
        title: "Please Accept Terms",
        description: "You must check the acceptance box before signing.",
        variant: "destructive",
      });
      return;
    }

    setSigning(true);
    try {
      const { error } = await supabase
        .from("user_waivers")
        .insert({
          user_id: userId,
          waiver_type: waiverType,
          signed_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      toast({
        title: "Waiver Signed",
        description: "Thank you for signing the waiver.",
      });
      
      setAcceptedTerms(false);
      fetchWaivers();
    } catch (error) {
      console.error("Error signing waiver:", error);
      toast({
        title: "Error",
        description: "Failed to sign waiver.",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const isWaiverSigned = (type: string) => {
    return waivers.some(w => w.waiver_type === type);
  };

  const getWaiverDate = (type: string) => {
    const waiver = waivers.find(w => w.waiver_type === type);
    return waiver?.signed_at ? new Date(waiver.signed_at).toLocaleDateString() : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const allWaiversSigned = requiredWaivers.every(w => isWaiverSigned(w.type));

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <GlowCard className={`p-6 ${allWaiversSigned ? "border-green-500/30" : "border-amber-500/30"}`}>
        <div className="flex items-center gap-3">
          {allWaiversSigned ? (
            <>
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-green-500">All Requirements Complete</h3>
                <p className="text-sm text-muted-foreground">You've signed all required documents</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-amber-500">Action Required</h3>
                <p className="text-sm text-muted-foreground">Please complete the required documents below</p>
              </div>
            </>
          )}
        </div>
      </GlowCard>

      {/* Waivers & Documents */}
      <div>
        <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Required Documents
        </h3>

        <div className="space-y-4">
          {requiredWaivers.map((waiver) => (
            <GlowCard key={waiver.type} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-display font-bold">{waiver.label}</h4>
                  {isWaiverSigned(waiver.type) && (
                    <p className="text-sm text-muted-foreground">
                      Signed on {getWaiverDate(waiver.type)}
                    </p>
                  )}
                </div>
                {isWaiverSigned(waiver.type) ? (
                  <Badge className="bg-green-500/20 text-green-500">Signed</Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-500">Required</Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(waiver.link)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Document
                </Button>
              </div>

              {!isWaiverSigned(waiver.type) && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    />
                    <span className="text-sm text-muted-foreground">
                      I have read and agree to the terms outlined in this document
                    </span>
                  </label>
                  <Button
                    variant="neon"
                    onClick={() => handleSignWaiver(waiver.type)}
                    disabled={!acceptedTerms || signing}
                  >
                    {signing ? "Signing..." : "Sign Document"}
                  </Button>
                </div>
              )}
            </GlowCard>
          ))}
        </div>
      </div>

      {/* Report Issue */}
      <GlowCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-display font-bold">Safety & Support</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Your safety is our priority. If you experience any issues or concerns, please reach out.
        </p>
        <Button variant="outline" onClick={() => navigate("/contact")}>
          Report an Issue
        </Button>
      </GlowCard>

      {/* Legal Links */}
      <GlowCard className="p-6 bg-muted/30">
        <h4 className="font-display font-bold mb-4">Legal Documents</h4>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/legal/terms")}>
            Terms of Service
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/legal/privacy")}>
            Privacy Policy
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/legal/code-of-conduct")}>
            Code of Conduct
          </Button>
        </div>
      </GlowCard>
    </div>
  );
};
