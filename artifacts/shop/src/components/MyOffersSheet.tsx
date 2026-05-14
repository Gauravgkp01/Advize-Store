import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { Gift, Star, Loader2, Phone, Store, Search } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { getStore, getLoyaltyCard, redeemLoyalty, getSubdomainSlug } from "@/lib/api";
import type { Store as StoreType, LoyaltyCard } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const PHONE_KEY = "advize_customer_phone";

// Stable — never changes within a page load
const SUBDOMAIN_SLUG = getSubdomainSlug();

/* ── Detect which store the visitor is browsing ────────────────────────── */
function useVisitorStore() {
  const [location] = useLocation();
  const { storeId: cartStoreId, storeSlug: cartSlug } = useCart();
  const [fetchedStore, setFetchedStore] = useState<StoreType | null>(null);

  // Slug from URL path (/store/:slug/*) — works on main domain
  const urlSlug = useMemo(() => {
    const m = location.match(/^\/store\/([^/]+)/);
    return m?.[1] ?? null;
  }, [location]);

  // Effective slug: URL path wins, then subdomain, then nothing
  const effectiveSlug = urlSlug ?? SUBDOMAIN_SLUG;

  const isVisitorPage = !!effectiveSlug || !!cartStoreId;

  // Fetch store when we have a slug but don't already have its data
  useEffect(() => {
    if (!effectiveSlug) return;
    if (effectiveSlug === cartSlug && cartStoreId) return; // cart already has it
    if (fetchedStore?.slug === effectiveSlug) return;      // already fetched
    getStore(effectiveSlug).then(setFetchedStore).catch(() => {});
  }, [effectiveSlug, cartSlug, cartStoreId]);

  // Resolve storeId: cart fast-path → fetched → null
  const storeId: string | null = effectiveSlug
    ? (effectiveSlug === cartSlug && cartStoreId
        ? cartStoreId
        : fetchedStore?.slug === effectiveSlug ? fetchedStore.id : null)
    : cartStoreId;

  // Resolve store branding — try fetched first, fall back to nothing
  const store: StoreType | null = fetchedStore ?? null;

  return { storeId, store, isVisitorPage };
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function MyOffersSheet() {
  const { storeId, store, isVisitorPage } = useVisitorStore();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) ?? "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const autoSearchedRef = useRef(false);

  // Auto-search when sheet opens, or when storeId resolves after opening
  useEffect(() => {
    if (!open) { autoSearchedRef.current = false; return; }
    if (!storeId) return;
    if (autoSearchedRef.current) return;
    const saved = localStorage.getItem(PHONE_KEY) ?? "";
    if (saved.trim().replace(/\D/g, "").length >= 10) {
      autoSearchedRef.current = true;
      doSearch(storeId, saved);
    }
  }, [open, storeId]);

  const doSearch = async (resolvedStoreId: string, phoneOverride?: string) => {
    const raw = (phoneOverride ?? phone).trim().replace(/\D/g, "").slice(-10);
    if (raw.length < 10) return;
    localStorage.setItem(PHONE_KEY, (phoneOverride ?? phone).trim());
    setLoading(true);
    setSearched(true);
    try {
      const card = await getLoyaltyCard(resolvedStoreId, raw);
      setLoyaltyCard(card);
    } catch {
      setLoyaltyCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchClick = () => {
    if (!storeId) return;
    autoSearchedRef.current = true;
    doSearch(storeId);
  };

  const handleRedeem = async () => {
    if (!storeId) return;
    const raw = phone.trim().replace(/\D/g, "").slice(-10);
    setRedeeming(true);
    try {
      await redeemLoyalty(storeId, raw);
      toast({ title: "🎁 Reward redeemed!", description: "Show this to the store to claim your reward." });
      const updated = await getLoyaltyCard(storeId, raw);
      setLoyaltyCard(updated);
    } catch {
      toast({ title: "Could not redeem", description: "Please try again.", variant: "destructive" });
    } finally {
      setRedeeming(false);
    }
  };

  if (!isVisitorPage) return null;

  const stampsRequired = loyaltyCard?.stamps_required ?? 10;
  const stampsEarned   = loyaltyCard?.stamps ?? 0;
  const canRedeem      = stampsEarned >= stampsRequired;
  // When reward is ready, show ALL slots as filled gold stars
  const progress       = canRedeem ? 1 : Math.min(stampsEarned / stampsRequired, 1);
  const storeName      = store?.name ?? "Your Store";
  const logoUrl        = store?.logo_url ?? "";

  return (
    <>
      {/* Floating trigger pill — pulses when reward is ready */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 left-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl font-semibold text-sm text-amber-900 select-none active:scale-95 transition-transform ${canRedeem && loyaltyCard ? "animate-bounce" : ""}`}
        style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}
        aria-label="My Offers"
      >
        <Gift className="w-4 h-4 shrink-0" />
        {canRedeem && loyaltyCard ? "Claim Reward! 🎉" : "My Offers"}
      </button>

      {/* Bottom sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-0">
            <SheetTitle className="text-base flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" />
              My Loyalty Card
            </SheetTitle>
          </SheetHeader>

          <div className="px-5 pb-8 pt-4 space-y-4">
            {/* Phone input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                    setSearched(false);
                    setLoyaltyCard(null);
                    autoSearchedRef.current = false;
                  }}
                  onKeyDown={e => e.key === "Enter" && handleSearchClick()}
                  className="pl-9 h-11 rounded-xl text-base"
                  maxLength={15}
                />
              </div>
              <Button
                onClick={handleSearchClick}
                disabled={loading || !storeId || phone.trim().replace(/\D/g, "").length < 10}
                className="h-11 px-4 rounded-xl gap-1.5"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
              </div>
            )}

            {/* No loyalty program */}
            {!loading && searched && !loyaltyCard?.enabled && (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Gift className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-semibold text-sm">No loyalty card found</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  This store hasn't set up a loyalty program yet, or no stamps have been collected for this number.
                </p>
              </div>
            )}

            {/* The Card */}
            {!loading && loyaltyCard?.enabled && (
              <div className="space-y-3">

                {/* ── Reward unlocked banner ───────────────────────────── */}
                {canRedeem && (
                  <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)" }}>
                    <span className="text-2xl">🎉</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-amber-900 font-bold text-sm leading-tight">Your reward is ready!</p>
                      <p className="text-amber-800 text-xs mt-0.5 truncate">Tap below to claim: <strong>{loyaltyCard.reward}</strong></p>
                    </div>
                    <span className="text-2xl">🎁</span>
                  </div>
                )}

                {/* ── The physical card ───────────────────────────────── */}
                <div
                  className="relative overflow-hidden rounded-2xl shadow-xl"
                  style={{
                    background: canRedeem
                      ? "linear-gradient(135deg, #92400e 0%, #b45309 40%, #d97706 70%, #fbbf24 100%)"
                      : "linear-gradient(135deg, #1c1917 0%, #292524 40%, #3d3430 70%, #1c1917 100%)",
                  }}
                >
                  {/* Decorative circles */}
                  <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-10 bg-white" />
                  <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-5 bg-white" />
                  <div className="absolute top-1/2 right-6 -translate-y-1/2 w-20 h-20 rounded-full opacity-5 bg-white" />

                  {/* Sticker decorations */}
                  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 5 }}>
                    <span className="absolute top-2 right-3 text-3xl" style={{ transform: "rotate(14deg)", opacity: canRedeem ? 0.95 : 0.55 }}>🎁</span>
                    <span className="absolute bottom-2 right-2 text-2xl" style={{ transform: "rotate(-10deg)", opacity: canRedeem ? 0.9 : 0.45 }}>🎉</span>
                    <span className="absolute top-1/2 right-0 -translate-y-1/2 text-xl" style={{ transform: "translateY(-50%) rotate(8deg)", opacity: canRedeem ? 0.85 : 0.35 }}>✨</span>
                    {canRedeem && (
                      <>
                        <span className="absolute top-1 left-1/2 text-2xl" style={{ transform: "translateX(-50%) rotate(-8deg)", opacity: 0.9 }}>🎊</span>
                        <span className="absolute bottom-1 left-3 text-2xl" style={{ transform: "rotate(12deg)", opacity: 0.85 }}>🎈</span>
                        <span className="absolute top-8 left-2 text-lg" style={{ transform: "rotate(-15deg)", opacity: 0.75 }}>⭐</span>
                      </>
                    )}
                  </div>

                  <div className="relative z-10 p-5 space-y-4">
                    {/* Header: logo + store name */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {logoUrl ? (
                          <img src={logoUrl} alt={storeName}
                            className="w-11 h-11 rounded-full object-cover border-2 border-white/20 shadow-lg" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-white/15 border-2 border-white/20 flex items-center justify-center shadow-lg">
                            <Store className="w-5 h-5 text-white/80" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-bold text-base leading-tight tracking-wide">{storeName}</p>
                          <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium mt-0.5">
                            {canRedeem ? "🎉 Reward Unlocked!" : "Loyalty Card"}
                          </p>
                        </div>
                      </div>
                      {canRedeem && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900 px-2 py-1 rounded-full shadow animate-pulse">
                          Claim Now!
                        </span>
                      )}
                    </div>

                    {/* Stamp grid — all slots gold when canRedeem */}
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: stampsRequired }).map((_, i) => {
                        const filled = canRedeem || i < stampsEarned;
                        return (
                          <div
                            key={i}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                              filled
                                ? canRedeem
                                  ? "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)]"
                                  : "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                                : "bg-white/8 border border-white/20"
                            }`}
                          >
                            <Star
                              className={`w-4 h-4 transition-all ${
                                filled ? "text-amber-900 fill-amber-900" : "text-white/25"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar — full when canRedeem */}
                    <div className="space-y-1.5">
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-700"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-white/60 text-[11px]">
                          <span className="text-white font-semibold">{stampsEarned}</span> / {stampsRequired} stamps
                          {(loyaltyCard.redeemed_count ?? 0) > 0 && (
                            <span className="text-amber-400 ml-2">· {loyaltyCard.redeemed_count} redeemed</span>
                          )}
                        </p>
                        {!canRedeem && (
                          <p className="text-white/50 text-[11px]">{stampsRequired - stampsEarned} more to go</p>
                        )}
                      </div>
                    </div>

                    {/* Reward label */}
                    <div className="flex items-center gap-2 bg-white/8 rounded-xl px-3 py-2 border border-white/10">
                      <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <p className="text-white/80 text-xs">
                        Reward: <span className="text-amber-300 font-semibold">{loyaltyCard.reward}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Claim button — prominent when reward ready */}
                {canRedeem && (
                  <Button
                    className="w-full h-12 rounded-xl font-bold text-base shadow-xl"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#1c1917", border: "none" }}
                    onClick={handleRedeem}
                    disabled={redeeming}
                  >
                    {redeeming
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <><Gift className="w-5 h-5 mr-2" />Claim Your Reward</>
                    }
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
