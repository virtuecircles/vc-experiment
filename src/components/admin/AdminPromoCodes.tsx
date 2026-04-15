import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Tag, CheckCircle, XCircle, Copy } from "lucide-react";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  stripe_coupon_id: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  applicable_prices: string[] | null;
  created_at: string;
}

const PRICE_LABELS: Record<string, string> = {
  virtue_circles: "Monthly ($100/mo)",
  virtue_circles_annual: "Annual ($900/yr)",
  founding_100: "Founding ($50/mo)",
};

export const AdminPromoCodes = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    code: "",
    description: "",
    stripe_coupon_id: "",
    discount_type: "percent" as "percent" | "amount",
    discount_value: "",
    max_uses: "",
    valid_until: "",
    applicable_prices: [] as string[],
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.stripe_coupon_id.trim() || !form.discount_value) {
      toast({ title: "Missing fields", description: "Code, Stripe Coupon ID, and discount value are required.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("promo_codes").insert({
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        stripe_coupon_id: form.stripe_coupon_id.trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
        applicable_prices: form.applicable_prices.length > 0 ? form.applicable_prices : null,
      });

      if (error) throw error;

      toast({ title: "✓ Promo code created" });
      setShowCreate(false);
      setForm({ code: "", description: "", stripe_coupon_id: "", discount_type: "percent", discount_value: "", max_uses: "", valid_until: "", applicable_prices: [] });
      fetchCodes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create promo code", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      const { error } = await supabase
        .from("promo_codes")
        .update({ is_active: !currentlyActive })
        .eq("id", id);

      if (error) throw error;
      toast({ title: `Promo code ${!currentlyActive ? "activated" : "deactivated"}` });
      fetchCodes();
    } catch (error) {
      toast({ title: "Error updating code", variant: "destructive" });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: code });
  };

  const filtered = codes.filter((c) => {
    const q = search.toLowerCase();
    return c.code.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-display font-bold">Promo Codes ({codes.length})</h3>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search codes..." className="pl-9" />
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />New Code
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Stripe Coupon</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No promo codes found</TableCell>
              </TableRow>
            ) : (
              filtered.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="font-mono font-bold">{code.code}</span>
                      <button onClick={() => copyCode(code.code)} className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    {code.description && <p className="text-xs text-muted-foreground mt-1">{code.description}</p>}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {code.discount_type === "percent" ? `${code.discount_value}%` : `$${code.discount_value}`}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{code.stripe_coupon_id}</TableCell>
                  <TableCell>
                    {code.current_uses}{code.max_uses ? ` / ${code.max_uses}` : " / ∞"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {code.valid_until ? new Date(code.valid_until).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell>
                    {code.is_active ? (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch checked={code.is_active} onCheckedChange={() => toggleActive(code.id, code.is_active)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER25" maxLength={50} required />
              <p className="text-xs text-muted-foreground mt-1">Will be auto-uppercased. Users enter this at checkout.</p>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Summer 2026 promotion" maxLength={500} rows={2} />
            </div>

            <div>
              <Label>Stripe Coupon ID *</Label>
              <Input value={form.stripe_coupon_id} onChange={(e) => setForm({ ...form, stripe_coupon_id: e.target.value })} placeholder="e.g. SUMMER25 or coupon_abc123" required />
              <p className="text-xs text-muted-foreground mt-1">Create this coupon in Stripe first, then paste the ID here.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as "percent" | "amount" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value *</Label>
                <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder={form.discount_type === "percent" ? "25" : "50"} min="0" step="0.01" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Uses</Label>
                <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" min="1" />
              </div>
              <div>
                <Label>Expires</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Applicable Plans</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(PRICE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      const prices = form.applicable_prices.includes(key)
                        ? form.applicable_prices.filter((p) => p !== key)
                        : [...form.applicable_prices, key];
                      setForm({ ...form, applicable_prices: prices });
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      form.applicable_prices.includes(key)
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Leave empty to apply to all plans.</p>
            </div>

            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? "Creating..." : "Create Promo Code"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
