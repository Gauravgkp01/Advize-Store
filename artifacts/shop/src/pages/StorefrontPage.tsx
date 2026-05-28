import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  Store, Search, Star, MessageSquare, ArrowUpDown, TrendingUp, MapPin, ShoppingCart, Mail, Phone, FileText, ChevronDown, ChevronUp,
  Shirt, Footprints, UserRound, Gem, UtensilsCrossed, Smartphone, Palette, Sparkles,
  Baby, Home, Package, ShoppingBag, Watch, Dumbbell, BookOpen, Flower2, Scissors,
  Sofa, Glasses, Dog, Car, Bike, Loader2, X, Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { ProductCard } from "@/components/ProductCard";
import { getStorefront, trackClick, waOptin, updateStore } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useStorefrontTheme } from "@/hooks/use-storefront-theme";
import { populatePdCacheFromStorefront } from "@/lib/product-cache";
import type { Store as StoreType, Product } from "@/lib/api";
import type { Review } from "@/lib/api";
import { setSEO, resetSEO, injectStoreJsonLd, removeStoreJsonLd } from "@/lib/seo";

type PriceSort = "none" | "asc" | "desc";

// ── Module-level session cache (stale-while-revalidate) ───────────────────────
// Survives re-renders and back-navigation.
// Also persisted to sessionStorage so hard-refreshes stay instant.
interface SFCacheEntry {
  store: StoreType;
  products: Product[];
  reviews: Review[];
  ts: number;
}
const sfCache = new Map<string, SFCacheEntry>();
const SF_CACHE_TTL = 5 * 60_000; // 5 minutes
const SF_SS_KEY = (slug: string) => `sf:${slug}`;

function sfCacheSet(slug: string, entry: SFCacheEntry) {
  sfCache.set(slug, entry);
  try { sessionStorage.setItem(SF_SS_KEY(slug), JSON.stringify(entry)); } catch {}
}

function sfCacheGet(slug: string): SFCacheEntry | null {
  const mem = sfCache.get(slug);
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(SF_SS_KEY(slug));
    if (!raw) return null;
    const entry = JSON.parse(raw) as SFCacheEntry;
    if (Date.now() - entry.ts < SF_CACHE_TTL) {
      sfCache.set(slug, entry); // seed in-memory cache
      return entry;
    }
    sessionStorage.removeItem(SF_SS_KEY(slug));
  } catch {}
  return null;
}

/** Call after any store update so the next visit fetches fresh data. */
export function bustStorefrontCache(slug: string) {
  sfCache.delete(slug);
  try { sessionStorage.removeItem(SF_SS_KEY(slug)); } catch {}
}

/* ── Store Footer ─────────────────────────────────────────── */
function StoreFooter({ store }: { store: StoreType | null }) {
  const [termsOpen, setTermsOpen] = useState(false);
  if (!store) return null;

  const hasContact = store.email || store.contact_phone;
  const hasTerms = !!store.terms_and_conditions;

  return (
    <footer className="border-t bg-muted/20 text-xs text-muted-foreground">
      {(hasContact || hasTerms) && (
        <div className="container max-w-5xl mx-auto px-4 py-5 space-y-4">
          {/* Contact row */}
          {hasContact && (
            <div className="flex flex-wrap gap-4">
              {store.email && (
                <a
                  href={`mailto:${store.email}`}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {store.email}
                </a>
              )}
              {store.contact_phone && (
                <a
                  href={`tel:${store.contact_phone}`}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {store.contact_phone}
                </a>
              )}
            </div>
          )}

          {/* Terms accordion */}
          {hasTerms && (
            <div className="border rounded-xl overflow-hidden">
              <button
                onClick={() => setTermsOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
              >
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Terms &amp; Conditions
                </span>
                {termsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {termsOpen && (
                <div className="px-4 py-3 border-t bg-background/40 whitespace-pre-wrap leading-relaxed text-[11px]">
                  {store.terms_and_conditions}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="container max-w-5xl mx-auto px-4 py-4 border-t text-center">
        Powered by <span className="font-bold text-foreground">Advize Store</span>
      </div>
    </footer>
  );
}

interface CategoryIconDef { icon: LucideIcon; color: string; bg: string }

const CATEGORY_ICON_MAP: { keywords: string[]; def: CategoryIconDef }[] = [
  { keywords: ["cloth", "fashion", "shirt", "dress", "wear", "apparel", "saree", "kurta", "kurti", "blouse", "top", "lehenga"], def: { icon: Shirt,          color: "text-pink-400",   bg: "bg-pink-400/10"   } },
  { keywords: ["shoe", "footwear", "sandal", "chappal", "boot", "slipper", "heel", "sneaker"],                                  def: { icon: Footprints,    color: "text-amber-400",  bg: "bg-amber-400/10"  } },
  { keywords: ["bangle", "jewel", "ring", "necklace", "gold", "silver", "ornament", "bracelet", "earring", "pendant"],         def: { icon: Gem,           color: "text-yellow-400", bg: "bg-yellow-400/10" } },
  { keywords: ["men", "gent", "male"],                                                                                          def: { icon: UserRound,     color: "text-blue-400",   bg: "bg-blue-400/10"   } },
  { keywords: ["food", "beverage", "eat", "drink", "snack", "restaurant", "cafe", "spice", "grocery", "sweet", "mithai"],      def: { icon: UtensilsCrossed, color: "text-orange-400", bg: "bg-orange-400/10" } },
  { keywords: ["electron", "mobile", "phone", "tech", "gadget", "computer", "laptop", "tablet"],                               def: { icon: Smartphone,    color: "text-cyan-400",   bg: "bg-cyan-400/10"   } },
  { keywords: ["handicraft", "craft", "handmade", "art", "pottery", "weave"],                                                  def: { icon: Palette,       color: "text-purple-400", bg: "bg-purple-400/10" } },
  { keywords: ["beauty", "cosmetic", "makeup", "skincare", "hair", "salon", "lipstick", "cream", "perfume"],                   def: { icon: Sparkles,      color: "text-rose-400",   bg: "bg-rose-400/10"   } },
  { keywords: ["kid", "child", "baby", "toy", "infant", "girl"],                                                               def: { icon: Baby,          color: "text-green-400",  bg: "bg-green-400/10"  } },
  { keywords: ["home", "furniture", "kitchen", "decor", "household", "utensil", "bed"],                                        def: { icon: Sofa,          color: "text-emerald-400",bg: "bg-emerald-400/10"} },
  { keywords: ["sport", "gym", "fitness", "exercise", "yoga", "cricket", "football"],                                          def: { icon: Dumbbell,      color: "text-red-400",    bg: "bg-red-400/10"    } },
  { keywords: ["book", "stationery", "study", "education", "notebook", "pen"],                                                 def: { icon: BookOpen,      color: "text-indigo-400", bg: "bg-indigo-400/10" } },
  { keywords: ["flower", "plant", "garden", "organic", "nursery"],                                                             def: { icon: Flower2,       color: "text-lime-400",   bg: "bg-lime-400/10"   } },
  { keywords: ["watch", "clock"],                                                                                               def: { icon: Watch,         color: "text-slate-400",  bg: "bg-slate-400/10"  } },
  { keywords: ["eyewear", "glass", "spectacle", "sunglass", "lens"],                                                           def: { icon: Glasses,       color: "text-sky-400",    bg: "bg-sky-400/10"    } },
  { keywords: ["tailor", "stitch", "sewing", "alteration"],                                                                    def: { icon: Scissors,      color: "text-fuchsia-400",bg: "bg-fuchsia-400/10"} },
  { keywords: ["pet", "dog", "cat", "animal"],                                                                                 def: { icon: Dog,           color: "text-brown-400",  bg: "bg-orange-900/10" } },
  { keywords: ["car", "auto", "vehicle", "tyre", "motor"],                                                                     def: { icon: Car,           color: "text-zinc-400",   bg: "bg-zinc-400/10"   } },
  { keywords: ["cycle", "bike", "bicycle", "scooter"],                                                                         def: { icon: Bike,          color: "text-teal-400",   bg: "bg-teal-400/10"   } },
];

const ALL_DEF: CategoryIconDef = { icon: Store,       color: "text-primary",        bg: "bg-primary/10"    };
const OTHER_DEF: CategoryIconDef = { icon: ShoppingBag, color: "text-muted-foreground", bg: "bg-muted/40"   };

function getCategoryIcon(cat: string): CategoryIconDef {
  if (cat === "All") return ALL_DEF;
  const lower = cat.toLowerCase();
  for (const entry of CATEGORY_ICON_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.def;
  }
  return OTHER_DEF;
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= Math.round(rating)
            ? "fill-amber-400 text-amber-400"
            : "fill-muted text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-card border rounded-2xl p-4 space-y-2 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {review.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-sm text-foreground">{review.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{review.date}</span>
      </div>
      <StarRating rating={review.rating} />
      <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
    </div>
  );
}

/* ── Trending card: compact horizontal scroll card ─────── */
function TrendingCard({
  product,
  reviewSummary,
  onClick,
}: {
  product: Product;
  reviewSummary?: { avg: number; count: number };
  onClick: () => void;
}) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="block shrink-0 w-28 sm:w-32"
      onClick={onClick}
    >
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-primary/30">
        <div className="aspect-square relative overflow-hidden bg-muted/30">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full"
            loading="lazy"
          />
          {!product.units && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-foreground text-[9px] font-bold px-2 py-0.5 rounded-full">Out of Stock</span>
            </div>
          )}
        </div>
        <div className="p-2 flex flex-col justify-between" style={{ height: "64px" }}>
          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{product.name}</p>
          {(() => {
            const isMix = product.productType === "mix_match";
            const displayPrice = isMix && product.pricingTiers && product.pricingTiers.length > 0
              ? Math.min(...product.pricingTiers.map(t => t.price))
              : (product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price
                ? product.salePrice
                : product.price);
            const hasSale = !isMix && product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
            return (
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-baseline gap-1">
                  <p className="text-sm font-extrabold text-primary">₹{displayPrice.toLocaleString("en-IN")}</p>
                  {hasSale && (
                    <p className="text-[9px] text-muted-foreground line-through">₹{product.price.toLocaleString("en-IN")}</p>
                  )}
                </div>
                {reviewSummary && reviewSummary.count > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span className="text-[9px] font-semibold text-foreground">{reviewSummary.avg.toFixed(1)}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </Link>
  );
}

// ── WhatsApp Opt-in Banner ─────────────────────────────────────────────────────
function WaOptinBanner({ store }: { store: StoreType | null }) {
  const storeId = store?.id ?? "";
  const storageKey = `wa_optin_${storeId}`;
  const savedPhone = typeof window !== "undefined" ? (localStorage.getItem("advize_customer_phone") ?? "") : "";

  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState(savedPhone);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);

  if (!store?.wa_phone_number_id || dismissed) return null;

  const handleSubmit = async () => {
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) return;
    setSubmitting(true);
    try {
      await waOptin(storeId, phone.trim(), name.trim());
      setSuccess(true);
      localStorage.setItem(storageKey, "1");
      setTimeout(() => setDismissed(true), 2500);
    } catch {
      setDismissed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-4 sm:mx-auto max-w-xl mb-6 bg-card border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
          <Bell className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {success ? (
            <div className="py-1">
              <p className="text-sm font-semibold text-[#25D366]">You're subscribed!</p>
              <p className="text-xs text-muted-foreground mt-0.5">We'll send you offers and updates on WhatsApp.</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Get offers on WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Subscribe to receive exclusive deals and restock alerts.</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-8 text-sm rounded-lg border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
                />
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="WhatsApp number (e.g. 9876543210)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="flex-1 h-8 text-sm rounded-lg border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || phone.replace(/\D/g, "").length < 10}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-[#25D366] hover:bg-[#20BA5A] text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Subscribe
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">By subscribing you agree to receive WhatsApp messages from this store. Reply STOP to opt out anytime.</p>
            </>
          )}
        </div>
        <button
          onClick={() => { setDismissed(true); localStorage.setItem(storageKey, "1"); }}
          className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function StorefrontPage({ forcedSlug }: { forcedSlug?: string } = {}) {
  const params = useParams();
  const [, navigate] = useLocation();
  const slug = forcedSlug ?? params.slug ?? "";
  const onSubdomain = !!forcedSlug;

  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  const [search, setSearch] = useState("");
  const trendingScrollRef = useRef<HTMLDivElement>(null);
  const trendingPausedRef = useRef(false);
  const trendingRafRef = useRef<number>(0);

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [priceSort, setPriceSort] = useState<PriceSort>("none");
  const [themeSaving, setThemeSaving] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const { totalItems } = useCart();
  const { user } = useAuth();
  const isOwner = !!user && !!store?.owner_id && user.uid === store.owner_id;

  useStorefrontTheme(store?.storefront_theme);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function fetchAndApply(background: boolean) {
      try {
        const payload = await getStorefront(slug);
        if (cancelled) return;
        // Update session cache (also persists to sessionStorage)
        sfCacheSet(slug, { store: payload.store, products: payload.products, reviews: payload.reviews, ts: Date.now() });
        // Pre-populate product detail cache — navigating to any product is now instant
        populatePdCacheFromStorefront(payload.store, payload.products, payload.reviews);
        setStore(payload.store);
        setProducts(payload.products);
        setReviews(payload.reviews);
      } catch (e: any) {
        if (!background && !cancelled) setError(e.message ?? "Failed to load store");
      } finally {
        if (!background && !cancelled) setLoading(false);
      }
    }

    // Serve stale session cache (memory or sessionStorage) while revalidating
    const hit = sfCacheGet(slug);
    if (hit && Date.now() - hit.ts < SF_CACHE_TTL) {
      setStore(hit.store);
      setProducts(hit.products);
      setReviews(hit.reviews);
      setLoading(false);
      fetchAndApply(true); // background revalidation
    } else {
      setLoading(true);
      fetchAndApply(false);
    }

    return () => { cancelled = true; };
  }, [slug]);

  // ── Dynamic SEO ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!store) return;
    const storeUrl = `https://store.advize.in/store/${store.slug}`;
    const desc = store.description?.trim()
      ? store.description.trim()
      : `Shop at ${store.name}${store.location ? ` in ${store.location}` : ""}. Browse products and order easily on WhatsApp.`;
    setSEO({
      title: `${store.name} — Online Store | Advize`,
      description: desc,
      url: storeUrl,
      image: store.logo_url || undefined,
    });
    injectStoreJsonLd({
      name: store.name,
      description: desc,
      url: storeUrl,
      image: store.logo_url || undefined,
      location: store.location,
    });
    return () => {
      resetSEO();
      removeStoreJsonLd();
    };
  }, [store]);

  const handleProductClick = (product: Product) => {
    if (store?.id) trackClick(product.id, store.id);
  };

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map(p => p.category).filter(Boolean))
    ) as string[];
    return ["All", ...cats];
  }, [products]);

  const productReviewMap = useMemo(() => {
    const map: Record<string, { avg: number; count: number }> = {};
    for (const r of reviews) {
      if (!map[r.product_id]) map[r.product_id] = { avg: 0, count: 0 };
      map[r.product_id].count++;
      map[r.product_id].avg += r.rating;
    }
    for (const pid in map) {
      map[pid].avg = map[pid].avg / map[pid].count;
    }
    return map;
  }, [reviews]);

  /* Trending = merchant-pinned products first; if none pinned, fall back to review-sorted */
  const trendingProducts = useMemo(() => {
    const pinned = products.filter(p => p.trending);
    if (pinned.length > 0) return pinned;
    const withReviews = products
      .filter(p => productReviewMap[p.id])
      .sort((a, b) => (productReviewMap[b.id]?.avg ?? 0) - (productReviewMap[a.id]?.avg ?? 0));
    const withoutReviews = products.filter(p => !productReviewMap[p.id]);
    return [...withReviews, ...withoutReviews];
  }, [products, productReviewMap]);

  /* ── Trending auto-scroll (JS-driven, manually interruptible) ── */
  useEffect(() => {
    const el = trendingScrollRef.current;
    if (!el || trendingProducts.length === 0) return;
    el.scrollLeft = 0;
    const SPEED = 45; // px per second
    let last: number | null = null;
    function step(ts: number) {
      if (!el) return;
      if (!trendingPausedRef.current) {
        if (last !== null) {
          el.scrollLeft += (SPEED * (ts - last)) / 1000;
          if (el.scrollLeft >= el.scrollWidth / 2) {
            el.scrollLeft -= el.scrollWidth / 2;
          }
        }
        last = ts;
      } else {
        last = null;
      }
      trendingRafRef.current = requestAnimationFrame(step);
    }
    trendingRafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(trendingRafRef.current);
  }, [trendingProducts.length]);

  const filteredProducts = useMemo(() => {
    let list = activeCategory === "All"
      ? products
      : products.filter(p => p.category === activeCategory);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    }

    const effectivePrice = (p: Product) =>
      p.productType === "mix_match" && p.pricingTiers && p.pricingTiers.length > 0
        ? Math.min(...p.pricingTiers.map(t => t.price))
        : (p.salePrice ?? p.price);
    if (priceSort === "asc") list = [...list].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (priceSort === "desc") list = [...list].sort((a, b) => effectivePrice(b) - effectivePrice(a));

    return list;
  }, [products, activeCategory, search, priceSort]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return null;
    return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const cyclePriceSort = () => {
    setPriceSort(prev =>
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
    );
  };

  /* Hide trending when user is searching/filtering */
  const showTrending = !search.trim() && activeCategory === "All" && trendingProducts.length > 0;

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        {/* Skeleton navbar */}
        <header className="sticky top-0 z-50 bg-muted/95 backdrop-blur border-b px-4 sm:px-6">
          <div className="container max-w-5xl mx-auto h-14 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted animate-pulse" />
            <div className="flex-1 flex justify-center">
              <div className="h-4 w-32 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
          </div>
        </header>
        {/* Skeleton search */}
        <div className="bg-background/95 border-b px-4 py-2.5 sm:px-6">
          <div className="container max-w-6xl mx-auto">
            <div className="h-9 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
        {/* Skeleton product grid */}
        <main className="flex-1 container max-w-6xl mx-auto px-2.5 sm:px-6 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded-full w-3/4" />
                  <div className="h-3 bg-muted rounded-full w-1/2" />
                  <div className="h-4 bg-muted rounded-full w-1/3 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <Store className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold">Store not found</h2>
        <p className="text-muted-foreground text-sm">This store doesn't exist or may have been removed.</p>
        <button onClick={() => navigate("/dashboard")} className="text-primary text-sm font-medium hover:underline">Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">

      {/* ── Store Navbar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 sf-header bg-muted/95 backdrop-blur text-foreground border-b px-4 sm:px-6">
        <div className="container max-w-5xl mx-auto">
          {/* Main nav row */}
          <div className="h-14 flex items-center">
            {/* Left: store logo */}
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border bg-background flex items-center justify-center">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            {/* Center: store name (absolute so it's truly centred) */}
            <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none h-14">
              <h1 className="font-bold text-base sm:text-lg leading-tight truncate max-w-[55%] text-center text-foreground">
                {store.name}
              </h1>
            </div>

            {/* Right: my orders + cart icons (only shown when payment is set up) */}
            {(store.razorpay_account_id || store.razorpay_key_id || store.advize_payment_enabled) ? (
              <div className="ml-auto flex items-center gap-1">
                <Link
                  href={onSubdomain ? "/orders" : `/store/${slug}/orders`}
                  className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted-foreground/10 transition-colors"
                  title="My Orders"
                >
                  <Package className="h-5 w-5 text-foreground" />
                </Link>
                <Link
                  href={onSubdomain ? "/cart" : `/store/${slug}/cart`}
                  className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted-foreground/10 transition-colors"
                >
                  <ShoppingCart className="h-5 w-5 text-foreground" />
                  {totalItems > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center leading-none shadow">
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </Link>
              </div>
            ) : <div className="ml-auto" />}
          </div>

          {/* Metadata row */}
          {(store.category || store.location || avgRating) && (
            <div className="flex items-center gap-2 pb-2 flex-wrap">
              {store.category && (
                <span className="text-muted-foreground text-[10px] font-medium">{store.category}</span>
              )}
              {store.location && (
                <span className="text-muted-foreground text-[10px] flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />{store.location}
                </span>
              )}
              {avgRating && (
                <span className="bg-muted-foreground/15 text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  {avgRating} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Search Bar ───────────────────────────────────────── */}
      <div className="bg-background/95 backdrop-blur border-b px-4 py-2.5 sm:px-6">
        <div className="container max-w-6xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-9 rounded-xl border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      <main className="flex-1 container max-w-6xl mx-auto px-0 sm:px-6 pt-4 pb-10">

        {/* ── About This Store ──────────────────────────────────── */}
        {store?.about && (
          <section className="mb-8 px-2.5 sm:px-0" aria-label={`About ${store.name}`}>
            <div className="bg-card border rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.name}
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-foreground leading-tight">
                    About {store.name}
                  </h2>
                  {store.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {store.location}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {store.about}
              </p>
            </div>
          </section>
        )}

        {/* ── Trending Products ─────────────────────────────────── */}
        {showTrending && (
          <div className="mb-8">
            <div className="flex items-center gap-1.5 mb-3 px-2.5 sm:px-0">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Trending Now</h2>
            </div>
            {/* Scroll track — auto-scrolls, pauses on touch/drag for manual control */}
            <div
              ref={trendingScrollRef}
              className="overflow-x-auto no-scrollbar pb-3 cursor-grab active:cursor-grabbing select-none"
              style={{ maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)" }}
              onPointerDown={() => { trendingPausedRef.current = true; }}
              onPointerUp={() => { trendingPausedRef.current = false; }}
              onPointerLeave={() => { trendingPausedRef.current = false; }}
              onTouchStart={() => { trendingPausedRef.current = true; }}
              onTouchEnd={() => { trendingPausedRef.current = false; }}
            >
              <div className="flex gap-2.5 w-max">
                {/* First copy */}
                {trendingProducts.map(product => (
                  <TrendingCard
                    key={product.id}
                    product={product}
                    reviewSummary={productReviewMap[product.id]}
                    onClick={() => handleProductClick(product)}
                  />
                ))}
                {/* Duplicate for seamless loop */}
                {trendingProducts.map(product => (
                  <TrendingCard
                    key={`dup-${product.id}`}
                    product={product}
                    reviewSummary={productReviewMap[product.id]}
                    onClick={() => handleProductClick(product)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Category Icons ───────────────────────────────────── */}
        {categories.length > 1 && (
          <div className="mb-4">
            <div
              className="flex gap-3 overflow-x-auto px-2.5 sm:px-0 pb-1 scrollbar-none"
              data-testid="category-icons"
            >
              {categories.map(cat => {
                const { icon: Icon, color, bg } = getCategoryIcon(cat);
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="flex flex-col items-center gap-1.5 shrink-0"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border-2 ${
                      isActive
                        ? `border-primary ${bg} shadow-md scale-105`
                        : `border-border ${bg} hover:border-primary/40 hover:scale-105`
                    }`}>
                      <Icon className={`h-6 w-6 transition-colors ${isActive ? "text-primary" : color}`} />
                    </div>
                    <span className={`text-[10px] font-semibold w-14 text-center leading-tight line-clamp-2 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {cat}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Sort + Count row ─────────────────────────────────── */}
        {products.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-3 px-2.5 sm:px-0">
            <span className="text-xs text-muted-foreground font-medium">
              {filteredProducts.length === products.length
                ? `${products.length} item${products.length !== 1 ? "s" : ""}`
                : `${filteredProducts.length} of ${products.length}`}
              {search && <span className="ml-1">for "<strong>{search}</strong>"</span>}
            </span>
            <button
              onClick={cyclePriceSort}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                priceSort !== "none"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary/50"
              }`}
            >
              <ArrowUpDown className="h-3 w-3" />
              {priceSort === "asc" ? "Low → High" : priceSort === "desc" ? "High → Low" : "Price"}
            </button>
          </div>
        )}

        {/* ── Product Grid ─────────────────────────────────────── */}
        <div className="px-2.5 sm:px-0">
          {products.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No products yet</p>
              <p className="text-sm mt-1">This store hasn't added any products yet.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No products found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
              <button
                onClick={() => { setSearch(""); setActiveCategory("All"); }}
                className="text-sm text-primary font-semibold mt-3 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6 mb-10">
              {filteredProducts.map((product, idx) => (
                <div key={product.id} onClick={() => handleProductClick(product)} className="h-full">
                  <ProductCard
                    product={product}
                    showActions={false}
                    reviewSummary={productReviewMap[product.id]}
                    priority={idx < 4}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Reviews Section ──────────────────────────────────── */}
        <div className="border-t mt-2 px-2.5 sm:px-0">
          <button
            onClick={() => setReviewsOpen(o => !o)}
            className="w-full flex items-center justify-between py-5 text-left"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Customer Reviews</h2>
              {reviews.length > 0 && avgRating && (
                <span className="text-xs text-muted-foreground font-normal">
                  · {avgRating}★ ({reviews.length})
                </span>
              )}
            </div>
            {reviewsOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
          </button>

          {reviewsOpen && (
            reviews.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-2xl mb-5">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="font-medium text-sm">No reviews yet</p>
                <p className="text-xs mt-1">Be the first to leave a review after ordering!</p>
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )
          )}
        </div>

      </main>

      <WaOptinBanner store={store} />

      <StoreFooter store={store} />

      {/* ── Owner-only floating theme toggle ─────────────────── */}
      {isOwner && (
        <div className="fixed bottom-6 right-4 z-50">
          <button
            disabled={themeSaving}
            onClick={async () => {
              if (!store) return;
              setThemeSaving(true);
              const next = store.storefront_theme === "light" ? "dark" : "light";
              try {
                const updated = await updateStore(store.id, { storefront_theme: next });
                setStore(prev => prev ? { ...prev, storefront_theme: updated.storefront_theme } : prev);
              } finally {
                setThemeSaving(false);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border font-semibold text-sm transition-all active:scale-95"
            style={{
              background: store.storefront_theme === "light" ? "#1a1a1a" : "#fff0f5",
              color: store.storefront_theme === "light" ? "#fff" : "#1a1a1a",
              borderColor: store.storefront_theme === "light" ? "#333" : "#f9a8c9",
            }}
          >
            {themeSaving
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : store.storefront_theme === "light"
                ? <span>🌙 Switch to Dark</span>
                : <span>🌸 Switch to Pink</span>
            }
          </button>
        </div>
      )}

    </div>
  );
}
