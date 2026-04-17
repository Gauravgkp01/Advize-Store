import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Store, Loader2, Search, Star, MessageSquare, ArrowUpDown, TrendingUp, MapPin } from "lucide-react";
import { Link } from "wouter";
import { ProductCard } from "@/components/ProductCard";
import { getStore, getProducts, trackClick, getStoreReviews } from "@/lib/api";
import type { Store as StoreType, Product } from "@/lib/api";
import type { Review } from "@/lib/api";

type PriceSort = "none" | "asc" | "desc";

const CATEGORY_EMOJI: Record<string, string> = {
  "All": "🏪",
  "Fashion & Clothing": "👗",
  "Food & Beverages": "🍔",
  "Electronics": "📱",
  "Handicrafts": "🎨",
  "Beauty & Cosmetics": "💄",
  "Jewellery": "💍",
  "Home": "🏠",
  "Kids": "🧸",
  "Men Fashion": "👔",
  "Other": "📦",
};
function getCategoryEmoji(cat: string) {
  return CATEGORY_EMOJI[cat] ?? "🛍️";
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
        <div className="p-2 space-y-0.5">
          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{product.name}</p>
          <div className="flex items-center justify-between gap-1">
            <p className="text-sm font-extrabold text-primary">₹{product.price.toLocaleString("en-IN")}</p>
            {reviewSummary && reviewSummary.count > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span className="text-[9px] font-semibold text-foreground">{reviewSummary.avg.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function StorefrontPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const slug = params.slug ?? "";

  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => { if (wasDark) html.classList.add("dark"); };
  }, []);

  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [priceSort, setPriceSort] = useState<PriceSort>("none");

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const s = await getStore(slug);
        if (cancelled) return;
        setStore(s);
        const [prods, revs] = await Promise.all([
          getProducts(s.id),
          getStoreReviews(s.id),
        ]);
        if (!cancelled) {
          setProducts(prods);
          setReviews(revs);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load store");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

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

    if (priceSort === "asc") list = [...list].sort((a, b) => a.price - b.price);
    if (priceSort === "desc") list = [...list].sort((a, b) => b.price - a.price);

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
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
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

      {/* ── Compact Store Header ─────────────────────────────── */}
      <header className="bg-primary text-primary-foreground py-4 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="container max-w-5xl mx-auto relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold leading-tight truncate">{store.name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {store.category && (
                <span className="text-primary-foreground/70 text-[10px] font-medium">{store.category}</span>
              )}
              {store.location && (
                <span className="text-primary-foreground/70 text-[10px] flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />{store.location}
                </span>
              )}
              {avgRating && (
                <span className="bg-white/15 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 backdrop-blur-sm">
                  <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                  {avgRating} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Sticky Search Bar ────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-2.5 sm:px-6">
        <div className="container max-w-5xl mx-auto">
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

      <main className="flex-1 container max-w-5xl mx-auto px-0 sm:px-6 pt-4 pb-10">

        {/* ── Trending Products ─────────────────────────────────── */}
        {showTrending && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-3 px-2.5 sm:px-0">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Trending Now</h2>
            </div>
            <div className="relative">
              <div className="flex gap-2.5 overflow-x-auto px-2.5 sm:px-0 pb-2 scrollbar-none">
                {trendingProducts.map(product => (
                  <TrendingCard
                    key={product.id}
                    product={product}
                    reviewSummary={productReviewMap[product.id]}
                    onClick={() => handleProductClick(product)}
                  />
                ))}
                {/* trailing spacer */}
                <div className="shrink-0 w-1" />
              </div>
              {/* right fade hint */}
              <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-background to-transparent sm:hidden" />
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
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all border-2 ${
                    activeCategory === cat
                      ? "border-primary bg-primary/10 shadow-sm scale-105"
                      : "border-border bg-muted/40 hover:border-primary/40"
                  }`}>
                    {getCategoryEmoji(cat)}
                  </div>
                  <span className={`text-[10px] font-medium w-12 text-center leading-tight line-clamp-1 ${
                    activeCategory === cat ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {cat === "All" ? "All" : cat.split(" ")[0]}
                  </span>
                </button>
              ))}
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5 mb-10">
              {filteredProducts.map((product) => (
                <div key={product.id} onClick={() => handleProductClick(product)}>
                  <ProductCard
                    product={product}
                    showActions={false}
                    reviewSummary={productReviewMap[product.id]}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Reviews Section ──────────────────────────────────── */}
        <div className="border-t pt-7 mt-2 px-2.5 sm:px-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Customer Reviews</h2>
            </div>
            {reviews.length > 0 && avgRating && (
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-foreground">{avgRating}</span>
                <div className="flex flex-col gap-0.5">
                  <StarRating rating={parseFloat(avgRating)} size={12} />
                  <span className="text-[10px] text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-2xl">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="font-medium text-sm">No reviews yet</p>
              <p className="text-xs mt-1">Be the first to leave a review after ordering!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>

      </main>

      <footer className="py-5 text-center text-muted-foreground border-t bg-muted/20 text-xs">
        <p>Powered by <span className="font-bold text-foreground">Advize Store</span></p>
      </footer>
    </div>
  );
}
