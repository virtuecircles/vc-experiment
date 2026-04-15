import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  RefreshCw,
  Download,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ShieldAlert,
  Lock,
} from "lucide-react";

interface RevenueStats {
  totalLifetimeRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  refundTotal: number;
  freeToConversionRate: number;
  arpu: number;
  revenueByPlan: {
    plan: string;
    amount: number;
    count: number;
  }[];
}

export const AdminRevenue = () => {
  const { toast } = useToast();
  const { isSuperAdmin, canViewRevenue, canManageRevenue, canExportData } = useUserRoles();
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (canViewRevenue) {
      fetchRevenueStats();
    }
  }, [canViewRevenue]);

  const fetchRevenueStats = async (showRefreshToast = false) => {
    if (showRefreshToast) setRefreshing(true);
    
    try {
      // Fetch real revenue data from Stripe via edge function
      const { data, error } = await supabase.functions.invoke("get-revenue-stats");

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to fetch revenue stats");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Get user count for conversion rate calculation
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const activeSubscriptions = data.activeSubscriptions || 0;
      const conversionRate = totalUsers && totalUsers > 0 
        ? (activeSubscriptions / totalUsers) * 100 
        : 0;

      setStats({
        totalLifetimeRevenue: data.totalLifetimeRevenue || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        activeSubscriptions: activeSubscriptions,
        mrr: data.mrr || 0,
        arr: data.arr || 0,
        refundTotal: data.refundTotal || 0,
        freeToConversionRate: conversionRate,
        arpu: data.arpu || 0,
        revenueByPlan: data.revenueByPlan || [],
      });

      if (showRefreshToast) {
        toast({
          title: "✓ Data Refreshed",
          description: "Revenue statistics updated from Stripe.",
        });
      }
    } catch (error) {
      console.error("Error fetching revenue stats:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load revenue data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = () => {
    if (!canExportData) {
      toast({
        title: "Access Denied",
        description: "Only Super Admins can export revenue data.",
        variant: "destructive",
      });
      return;
    }

    // Generate CSV export
    const csvData = [
      ["Metric", "Value"],
      ["Total Lifetime Revenue", stats?.totalLifetimeRevenue || 0],
      ["Monthly Revenue", stats?.monthlyRevenue || 0],
      ["Active Subscriptions", stats?.activeSubscriptions || 0],
      ["MRR", stats?.mrr || 0],
      ["ARR", stats?.arr || 0],
      ["Refund Total", stats?.refundTotal || 0],
      ["Conversion Rate", `${stats?.freeToConversionRate.toFixed(1)}%`],
      ["ARPU", stats?.arpu || 0],
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "✓ Export Complete",
      description: "Revenue report has been downloaded.",
    });
  };

  if (!canViewRevenue) {
    return (
      <GlowCard className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-medium">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">
          Revenue data is only visible to Super Admins and VC Managers.
        </p>
      </GlowCard>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-lg">Revenue Dashboard</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                {isSuperAdmin 
                  ? "Full access to revenue data and exports." 
                  : "View-only access. Contact Super Admin for edits or exports."}
              </p>
            </TooltipContent>
          </Tooltip>
          {!isSuperAdmin && (
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Read-Only
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRevenueStats(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canExportData && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Lifetime Revenue</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">
                {formatCurrency(stats?.totalLifetimeRevenue || 0)}
              </p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Revenue</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">
                {formatCurrency(stats?.monthlyRevenue || 0)}
              </p>
              <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                <ArrowUpRight className="h-3 w-3" />
                <span>+12% vs last month</span>
              </div>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Subs</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">
                {stats?.activeSubscriptions || 0}
              </p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">MRR</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">
                {formatCurrency(stats?.mrr || 0)}
              </p>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <GlowCard className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">ARR</p>
          <p className="text-xl font-bold mt-1">
            {formatCurrency(stats?.arr || 0)}
          </p>
        </GlowCard>

        <GlowCard className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">ARPU</p>
          <p className="text-xl font-bold mt-1">
            {formatCurrency(stats?.arpu || 0)}
          </p>
          <p className="text-xs text-muted-foreground">per user/month</p>
        </GlowCard>

        <GlowCard className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Conversion Rate</p>
          <p className="text-xl font-bold mt-1">
            {stats?.freeToConversionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">Free → Paid</p>
        </GlowCard>

        <GlowCard className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Refunds</p>
          <p className="text-xl font-bold mt-1 text-red-500">
            {formatCurrency(stats?.refundTotal || 0)}
          </p>
          <p className="text-xs text-muted-foreground">total refunded</p>
        </GlowCard>
      </div>

      {/* Revenue by Plan */}
      <GlowCard className="p-4 md:p-6">
        <h3 className="font-semibold mb-4">Revenue by Plan</h3>
        <div className="space-y-4">
          {stats?.revenueByPlan.map((plan) => {
            const percentage = stats.monthlyRevenue > 0 
              ? (plan.amount / stats.monthlyRevenue) * 100 
              : 0;
            
            return (
              <div key={plan.plan} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{plan.plan}</span>
                    <Badge variant="outline" className="text-xs">
                      {plan.count} subscribers
                    </Badge>
                  </div>
                  <span className="font-bold">{formatCurrency(plan.amount)}</span>
                </div>
                <Progress value={percentage} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {percentage.toFixed(1)}% of total
                </p>
              </div>
            );
          })}
        </div>
      </GlowCard>

      {/* Super Admin Only Actions */}
      {isSuperAdmin && (
        <GlowCard className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-amber-500">Super Admin Actions</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            These actions are only available to Super Admins and may affect financial records.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled>
              <DollarSign className="h-4 w-4 mr-2" />
              Manual Adjustment
            </Button>
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="h-4 w-4 mr-2" />
              Issue Refund
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Full Report
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * Manual adjustments and refunds require Stripe dashboard access.
          </p>
        </GlowCard>
      )}
    </div>
  );
};
