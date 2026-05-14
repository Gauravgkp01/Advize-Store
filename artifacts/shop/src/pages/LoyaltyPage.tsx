import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Gift, Tag, Loader2, Plus, Trash2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/hooks/use-store";
import {
  updateStore, getCoupons, createCoupon, deleteCoupon,
  type Coupon,
} from "@/lib/api";

export default function LoyaltyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { store, setStore } = useStore();

  /* ── Loyalty ─────────────────────────────────────── */
  const loyaltyEnabled = !!(store?.loyalty_enabled);
  const [showLoyaltyForm, setShowLoyaltyForm] = useState(false);
  const [loyaltyStamps, setLoyaltyStamps] = useState(
    store?.loyalty_stamps_required?.toString() ?? "10"
  );
  const [loyaltyReward, setLoyaltyReward] = useState(store?.loyalty_reward ?? "");
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  useEffect(() => {
    if (store) {
      setLoyaltyStamps(store.loyalty_stamps_required?.toString() ?? "10");
      setLoyaltyReward(store.loyalty_reward ?? "");
    }
  }, [store?.id]);

  const handleToggleLoyalty = async () => {
    if (!store?.id) return;
    setSavingLoyalty(true);
    try {
      const updated = await updateStore(store.id, { loyalty_enabled: !loyaltyEnabled });
      setStore(updated);
      if (!loyaltyEnabled) setShowLoyaltyForm(true);
      toast({ title: loyaltyEnabled ? "Loyalty program disabled" : "Loyalty program enabled!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally { setSavingLoyalty(false); }
  };

  const handleSaveLoyalty = async () => {
    if (!store?.id) return;
    const stamps = parseInt(loyaltyStamps, 10);
    if (!stamps || stamps < 1 || stamps > 100) {
      toast({ variant: "destructive", title: "Enter a stamp count between 1 and 100" }); return;
    }
    if (!loyaltyReward.trim()) {
      toast({ variant: "destructive", title: "Enter a reward description" }); return;
    }
    setSavingLoyalty(true);
    try {
      const updated = await updateStore(store.id, {
        loyalty_stamps_required: stamps,
        loyalty_reward: loyaltyReward.trim(),
      });
      setStore(updated);
      toast({ title: "Loyalty program saved!" });
      setShowLoyaltyForm(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally { setSavingLoyalty(false); }
  };

  /* ── Coupons ─────────────────────────────────────── */
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"percent" | "fixed">("percent");
  const [newCouponValue, setNewCouponValue] = useState("");
  const [newCouponDesc, setNewCouponDesc] = useState("");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState("");
  const [savingCoupon, setSavingCoupon] = useState(false);

  useEffect(() => {
    if (store?.id) getCoupons(store.id).then(setCoupons).catch(() => {});
  }, [store?.id]);

  const handleCreateCoupon = async () => {
    if (!store?.id) return;
    const code = newCouponCode.trim();
    const value = parseFloat(newCouponValue);
    if (!code) { toast({ variant: "destructive", title: "Enter a coupon code" }); return; }
    if (!value || value <= 0) { toast({ variant: "destructive", title: "Enter a valid discount value" }); return; }
    if (newCouponType === "percent" && value > 100) { toast({ variant: "destructive", title: "Percentage can't exceed 100%" }); return; }
    setSavingCoupon(true);
    try {
      await createCoupon({
        store_id: store.id, code, type: newCouponType, value,
        description: newCouponDesc.trim(),
        max_uses: newCouponMaxUses ? parseInt(newCouponMaxUses, 10) : null,
      });
      const updated = await getCoupons(store.id);
      setCoupons(updated);
      setNewCouponCode(""); setNewCouponValue(""); setNewCouponDesc(""); setNewCouponMaxUses("");
      setShowCouponForm(false);
      toast({ title: `Coupon ${code} created!` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally { setSavingCoupon(false); }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!store?.id) return;
    try {
      await deleteCoupon(store.id, code);
      setCoupons(prev => prev.filter(c => c.code !== code));
      toast({ title: `Coupon ${code} deleted` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/10">
      <Navbar />
      <main className="flex-1 container max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Button
          variant="ghost"
          className="mb-6 pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <h1 className="text-2xl font-bold mb-6">Loyalty & Coupons</h1>

        <div className="space-y-5">

          {/* ── Loyalty Program ───────────────────────────── */}
          <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-xl flex-shrink-0 ${loyaltyEnabled ? "bg-amber-50 dark:bg-amber-950/40" : "bg-amber-50/50 dark:bg-amber-950/20"}`}>
                  <Gift className={`h-6 w-6 ${loyaltyEnabled ? "text-amber-600 dark:text-amber-400" : "text-amber-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-base font-semibold text-foreground">Loyalty Program</h2>
                    {loyaltyEnabled ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Off</span>
                    )}
                  </div>
                  {loyaltyEnabled ? (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {store?.loyalty_stamps_required ?? 10} stamps → <strong className="text-foreground">{store?.loyalty_reward || "reward not set"}</strong>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Reward repeat customers with a digital stamp card. After a set number of orders, they unlock an exclusive offer.
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleToggleLoyalty}
                      disabled={savingLoyalty}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${
                        loyaltyEnabled
                          ? "bg-muted text-muted-foreground hover:bg-muted/80"
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                      }`}
                    >
                      {savingLoyalty
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : loyaltyEnabled
                          ? "Disable"
                          : <><Gift className="h-3.5 w-3.5" /> Enable</>
                      }
                    </button>
                    {loyaltyEnabled && (
                      <button
                        onClick={() => setShowLoyaltyForm(f => !f)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        Configure
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {loyaltyEnabled && showLoyaltyForm && (
              <div className="border-t bg-muted/30 px-5 sm:px-6 py-5 space-y-4">
                <p className="text-sm font-semibold">Configure Loyalty Program</p>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Stamps required to earn reward</label>
                  <Input
                    type="number" min={1} max={100}
                    value={loyaltyStamps}
                    onChange={e => setLoyaltyStamps(e.target.value)}
                    placeholder="e.g. 5, 10"
                    className="h-10 rounded-xl bg-background w-32"
                  />
                  <p className="text-[11px] text-muted-foreground">Each completed order = 1 stamp.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Reward description</label>
                  <Input
                    value={loyaltyReward}
                    onChange={e => setLoyaltyReward(e.target.value)}
                    placeholder="e.g. Get 10% off your next order"
                    className="h-10 rounded-xl bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">Customers will see this when their card is complete.</p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    💡 Example: Set stamps to <strong>10</strong> and reward to <strong>"Free delivery on your next order"</strong>. After 10 paid orders the customer sees a Claim button.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveLoyalty}
                    disabled={savingLoyalty}
                    className="h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white border-transparent px-5"
                  >
                    {savingLoyalty && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setShowLoyaltyForm(false)} className="h-10 rounded-xl px-5">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Coupon Codes ──────────────────────────────── */}
          <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex gap-4 items-start">
                <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl flex-shrink-0">
                  <Tag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-base font-semibold text-foreground">Coupon Codes</h2>
                    {coupons.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                        {coupons.length} active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Create discount codes your customers enter at checkout for a % or fixed-amount off.
                  </p>
                  <button
                    onClick={() => setShowCouponForm(f => !f)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Coupon
                  </button>
                </div>
              </div>

              {coupons.length > 0 && (
                <div className="mt-4 space-y-2">
                  {coupons.map(c => (
                    <div key={c.code} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2.5 gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-bold font-mono tracking-wide text-foreground">{c.code}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
                          {c.description ? ` · ${c.description}` : ""}
                          {c.max_uses != null ? ` · ${c.uses}/${c.max_uses} uses` : c.uses > 0 ? ` · ${c.uses} uses` : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteCoupon(c.code)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showCouponForm && (
              <div className="border-t bg-muted/30 px-5 sm:px-6 py-5 space-y-4">
                <p className="text-sm font-semibold">Create Coupon Code</p>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Code</label>
                  <Input
                    value={newCouponCode}
                    onChange={e => setNewCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                    placeholder="e.g. SAVE10, WELCOME20"
                    className="h-10 rounded-xl bg-background font-mono"
                    maxLength={20}
                  />
                  <p className="text-[11px] text-muted-foreground">Letters, numbers, _ and - only.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Discount type</label>
                    <div className="flex rounded-xl overflow-hidden border bg-background h-10">
                      <button
                        onClick={() => setNewCouponType("percent")}
                        className={`flex-1 text-xs font-semibold transition-colors ${newCouponType === "percent" ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-muted"}`}
                      >% Off</button>
                      <button
                        onClick={() => setNewCouponType("fixed")}
                        className={`flex-1 text-xs font-semibold transition-colors ${newCouponType === "fixed" ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-muted"}`}
                      >₹ Off</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      {newCouponType === "percent" ? "Percentage" : "Amount (₹)"}
                    </label>
                    <Input
                      type="number" min={1}
                      max={newCouponType === "percent" ? 100 : undefined}
                      value={newCouponValue}
                      onChange={e => setNewCouponValue(e.target.value)}
                      placeholder={newCouponType === "percent" ? "10" : "50"}
                      className="h-10 rounded-xl bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Description (optional)</label>
                  <Input
                    value={newCouponDesc}
                    onChange={e => setNewCouponDesc(e.target.value)}
                    placeholder="e.g. First order discount"
                    className="h-10 rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Max uses (optional)</label>
                  <Input
                    type="number" min={1}
                    value={newCouponMaxUses}
                    onChange={e => setNewCouponMaxUses(e.target.value)}
                    placeholder="Leave blank for unlimited"
                    className="h-10 rounded-xl bg-background w-48"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    💡 Customers enter this code at checkout to get the discount applied automatically.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateCoupon}
                    disabled={savingCoupon}
                    className="h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white border-transparent px-5"
                  >
                    {savingCoupon && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Coupon
                  </Button>
                  <Button variant="outline" onClick={() => setShowCouponForm(false)} className="h-10 rounded-xl px-5">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
