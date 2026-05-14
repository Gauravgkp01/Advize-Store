import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Package, Phone, Search, Loader2, Store,
  CheckCircle2, Clock, Truck, PackageCheck, XCircle, ShoppingBag,
  CreditCard, Receipt, ChevronDown, ChevronUp, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getStore, getOrdersByPhone, getLoyaltyCard, redeemLoyalty } from "@/lib/api";
import type { Store as StoreType, Order, OrderStatus, LoyaltyCard } from "@/lib/api";

/* ── Status config ──────────────────────────────────────────── */
const STATUS_STEPS: OrderStatus[] = ["pending", "confirmed", "packed", "out_for_delivery", "delivered"];

const STATUS_META: Record<OrderStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending:          { label: "Order Placed",      icon: Clock,         color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-100 dark:bg-amber-900/30" },
  confirmed:        { label: "Confirmed",          icon: CheckCircle2,  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-100 dark:bg-blue-900/30" },
  packed:           { label: "Packed",             icon: PackageCheck,  color: "text-violet-600 dark:text-violet-400",bg: "bg-violet-100 dark:bg-violet-900/30" },
  out_for_delivery: { label: "Out for Delivery",   icon: Truck,         color: "text-orange-600 dark:text-orange-400",bg: "bg-orange-100 dark:bg-orange-900/30" },
  delivered:        { label: "Delivered",          icon: CheckCircle2,  color: "text-green-600 dark:text-green-400",  bg: "bg-green-100 dark:bg-green-900/30" },
  cancelled:        { label: "Cancelled",          icon: XCircle,       color: "text-red-600 dark:text-red-400",      bg: "bg-red-100 dark:bg-red-900/30" },
};

/* ── Status Timeline ────────────────────────────────────────── */
function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    const m = STATUS_META.cancelled;
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${m.bg} w-fit`}>
        <m.icon className={`h-4 w-4 ${m.color}`} />
        <span className={`text-xs font-bold ${m.color}`}>Order Cancelled</span>
      </div>
    );
  }

  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto py-1">
      {STATUS_STEPS.map((step, idx) => {
        const m = STATUS_META[step];
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        const Icon = m.icon;
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                ${done ? (active ? m.bg + " ring-2 ring-offset-1 ring-current " + m.color : "bg-primary/15") : "bg-muted"}`}>
                <Icon className={`h-3.5 w-3.5 ${done ? (active ? m.color : "text-primary") : "text-muted-foreground"}`} />
              </div>
              <span className={`text-[9px] mt-0.5 text-center leading-tight max-w-[52px] font-medium
                ${done ? (active ? m.color : "text-primary") : "text-muted-foreground"}`}>
                {m.label}
              </span>
            </div>
            {/* Connector */}
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 rounded-full transition-all ${idx < currentIdx ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Order Card ─────────────────────────────────────────────── */
function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const m = STATUS_META[order.status] ?? STATUS_META.pending;
  const Icon = m.icon;
  const amount = (order.amount_paise ?? 0) / 100;
  const isActive = !["delivered", "cancelled"].includes(order.status);

  const createdAt = (() => {
    if (!order.created_at) return null;
    const ts = order.created_at?.seconds
      ? new Date(order.created_at.seconds * 1000)
      : new Date(order.created_at);
    return isNaN(ts.getTime()) ? null : ts;
  })();

  const txnId = order.razorpay_payment_id ?? order.cashfree_payment_id ?? null;
  const orderId = order.razorpay_order_id ?? null;

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-shadow ${isActive ? "ring-1 ring-primary/30 shadow-sm" : ""}`}>
      {/* Card header */}
      <div
        className="p-4 flex items-start gap-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${m.bg}`}>
          <Icon className={`h-5 w-5 ${m.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>{m.label}</span>
            <span className="text-base font-extrabold text-foreground">₹{amount.toLocaleString("en-IN")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            {" · "}
            {order.items.slice(0, 2).map(i => i.name).join(", ")}
            {order.items.length > 2 ? ` +${order.items.length - 2} more` : ""}
          </p>
          {createdAt && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <div className="shrink-0 text-muted-foreground mt-1">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Status timeline — always visible for active orders */}
      {isActive && (
        <div className="px-4 pb-3">
          <StatusTimeline status={order.status} />
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-4">
          {/* Items list */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items Ordered</p>
            <div className="space-y-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-foreground font-medium truncate block">{item.name}</span>
                    {item.variant && <span className="text-[10px] text-muted-foreground">{item.variant}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                    <span className="text-sm font-semibold ml-2">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment details */}
          <div className="bg-muted/40 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Payment Details</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Amount Paid</span>
              <span className="text-sm font-bold text-foreground">₹{amount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Payment Status</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                order.payment_status === "paid"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : order.payment_status === "failed"
                  ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}>
                {order.payment_status === "paid" ? "✓ Paid" : order.payment_status === "failed" ? "✗ Failed" : "⏳ Pending"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Method</span>
              <span className="text-xs font-medium capitalize">{order.payment_method === "advize" ? "Advize Pay" : "Razorpay"}</span>
            </div>
            {txnId && (
              <div className="pt-1 border-t space-y-1">
                <div className="flex items-start gap-1.5">
                  <CreditCard className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Transaction ID</p>
                    <p className="text-xs font-mono font-medium break-all">{txnId}</p>
                  </div>
                </div>
              </div>
            )}
            {orderId && (
              <div className="flex items-start gap-1.5">
                <Receipt className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Order Reference</p>
                  <p className="text-xs font-mono font-medium break-all">{orderId}</p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery address */}
          {order.buyer?.addressLine && (
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Delivery Address</p>
              <p className="text-sm text-foreground">{order.buyer.name}</p>
              <p className="text-xs text-muted-foreground">{order.buyer.addressLine}</p>
              <p className="text-xs text-muted-foreground">{order.buyer.city}{order.buyer.pincode ? ` – ${order.buyer.pincode}` : ""}</p>
            </div>
          )}

          {/* Order ID pill */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Order ID:</span>
            <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded-full">{order.id.slice(0, 12).toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
const PHONE_KEY = "advize_customer_phone";

export function OrderHistoryPage({ forcedSlug }: { forcedSlug?: string }) {
  const params = useParams<{ slug: string }>();
  const slug = forcedSlug ?? params.slug ?? "";
  const [, navigate] = useLocation();
  const onSubdomain = !!forcedSlug;

  const [store, setStore] = useState<StoreType | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) ?? "");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [loyaltyRedeeming, setLoyaltyRedeeming] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!slug) return;
    getStore(slug).then(s => setStore(s)).catch(() => setStore(null)).finally(() => setStoreLoading(false));
  }, [slug]);

  // Auto-search if phone is already saved
  useEffect(() => {
    if (phone.trim().length >= 10 && store) handleSearch();
  }, [store]);

  const handleSearch = async () => {
    const trimmed = phone.trim().replace(/\D/g, "").slice(-10);
    if (trimmed.length < 10 || !store) return;
    localStorage.setItem(PHONE_KEY, phone.trim());
    setLoading(true);
    setSearched(true);
    setLoyaltyCard(null);
    try {
      const [data] = await Promise.all([
        getOrdersByPhone(store.id, trimmed),
        getLoyaltyCard(store.id, trimmed).then(setLoyaltyCard).catch(() => {}),
      ]);
      setOrders(data.orders);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemLoyalty = async () => {
    if (!store?.id || !phone) return;
    const trimmed = phone.trim().replace(/\D/g, "").slice(-10);
    setLoyaltyRedeeming(true);
    try {
      await redeemLoyalty(store.id, trimmed);
      const updated = await getLoyaltyCard(store.id, trimmed);
      setLoyaltyCard(updated);
      toast({ title: "Reward claimed! 🎉", description: "Show this screen to the seller to claim your reward." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not redeem", description: err.message });
    } finally {
      setLoyaltyRedeeming(false);
    }
  };

  const activeOrders = orders?.filter(o => !["delivered", "cancelled"].includes(o.status)) ?? [];
  const pastOrders = orders?.filter(o => ["delivered", "cancelled"].includes(o.status)) ?? [];

  const storeHref = onSubdomain ? "/" : `/store/${slug}`;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-muted/95 backdrop-blur border-b px-4">
        <div className="container max-w-2xl mx-auto h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(storeHref)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted-foreground/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none h-14">
            <div className="flex items-center gap-2">
              {storeLoading ? (
                <div className="w-24 h-4 bg-muted-foreground/20 rounded animate-pulse" />
              ) : store?.logo_url ? (
                <img src={store.logo_url} alt={store?.name} className="w-6 h-6 rounded-lg object-cover border" />
              ) : (
                <Store className="h-4 w-4 text-muted-foreground" />
              )}
              {store && <span className="font-bold text-sm truncate max-w-[150px]">{store.name}</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 container max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold">My Orders</h1>
            <p className="text-xs text-muted-foreground">Track your orders and delivery status</p>
          </div>
        </div>

        {/* Phone lookup */}
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold">Enter your mobile number to view orders</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="pl-9 h-11 rounded-xl text-base"
                maxLength={15}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || phone.trim().replace(/\D/g, "").length < 10}
              className="h-11 px-4 rounded-xl gap-1.5"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Looking up your orders…</p>
          </div>
        )}

        {/* No results */}
        {!loading && searched && orders?.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No orders found</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              We couldn't find any orders for that number at this store. Make sure you're using the same number you placed the order with.
            </p>
          </div>
        )}

        {/* Active orders */}
        {!loading && activeOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-bold">Active Orders ({activeOrders.length})</p>
            </div>
            {activeOrders.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        )}

        {/* Past orders */}
        {!loading && pastOrders.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-muted-foreground">Past Orders ({pastOrders.length})</p>
            {pastOrders.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        )}

        {/* Loyalty card */}
        {!loading && searched && loyaltyCard?.enabled && (() => {
          const stampsRequired = loyaltyCard.stamps_required ?? 10;
          const stampsEarned   = loyaltyCard.stamps ?? 0;
          const canRedeem      = stampsEarned >= stampsRequired;
          return (
            <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {canRedeem ? "🎉 Reward Unlocked!" : "Your Loyalty Card"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {canRedeem
                      ? <>You've earned your reward: <strong className="text-foreground">{loyaltyCard.reward}</strong></>
                      : <>Collect <strong className="text-foreground">{stampsRequired}</strong> stamps to unlock: <strong className="text-foreground">{loyaltyCard.reward}</strong></>
                    }
                  </p>
                </div>
              </div>

              {/* Stamp grid */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: stampsRequired }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-colors ${
                      i < stampsEarned
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-border bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    {i < stampsEarned ? "★" : ""}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {stampsEarned} / {stampsRequired} stamps collected
                {(loyaltyCard.redeemed_count ?? 0) > 0 && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    · {loyaltyCard.redeemed_count} reward{loyaltyCard.redeemed_count !== 1 ? "s" : ""} redeemed
                  </span>
                )}
              </p>

              {canRedeem && (
                <Button
                  className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                  onClick={handleRedeemLoyalty}
                  disabled={loyaltyRedeeming}
                >
                  {loyaltyRedeeming
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : "🎁 Claim Your Reward"
                  }
                </Button>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
