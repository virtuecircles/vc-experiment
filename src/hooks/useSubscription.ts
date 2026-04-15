import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionState {
  subscribed: boolean;
  subscriptionTier: "founding_100" | "virtue_circles" | "virtue_circles_annual" | null;
  subscriptionEnd: string | null;
  subscriptionStatus: string | null;
  trialEnd: string | null;
  founding100: boolean;
  foundingDiscountUntil: string | null;
  loading: boolean;
  error: string | null;
}

// Derived helper: is the user on the monthly plan (eligible to upgrade to annual)?
export const isMonthlyPlan = (tier: string | null) =>
  tier === "virtue_circles" || tier === "founding_100";

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    subscriptionTier: null,
    subscriptionEnd: null,
    subscriptionStatus: null,
    trialEnd: null,
    founding100: false,
    foundingDiscountUntil: null,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setState({
        subscribed: data?.subscribed ?? false,
        subscriptionTier: data?.subscription_tier ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        subscriptionStatus: data?.subscription_status ?? null,
        trialEnd: data?.trial_end ?? null,
        founding100: data?.founding_100 ?? false,
        foundingDiscountUntil: data?.founding_discount_until ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error checking subscription:", err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to check subscription",
      }));
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setState({
        subscribed: false,
        subscriptionTier: null,
        subscriptionEnd: null,
        subscriptionStatus: null,
        trialEnd: null,
        founding100: false,
        foundingDiscountUntil: null,
        loading: false,
        error: null,
      });
    }
  }, [user, checkSubscription]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const createCheckout = async (priceType: "virtue_circles" | "virtue_circles_annual" | "founding_100", promoCode?: string) => {
    if (!session?.access_token) {
      throw new Error("Please sign in to subscribe");
    }

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceType, promoCode: promoCode?.trim() || undefined },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const upgradeToAnnual = async () => {
    if (!session?.access_token) {
      throw new Error("Please sign in to upgrade");
    }

    const { data, error } = await supabase.functions.invoke("upgrade-subscription", {
      body: { targetPriceType: "virtue_circles_annual" },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Upgrade failed");

    // Refresh subscription state after upgrade
    await checkSubscription();
    return data;
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      throw new Error("Please sign in to manage subscription");
    }

    const { data, error } = await supabase.functions.invoke("customer-portal", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  return {
    ...state,
    checkSubscription,
    createCheckout,
    upgradeToAnnual,
    openCustomerPortal,
  };
};
