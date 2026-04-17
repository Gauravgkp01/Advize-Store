import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Store, Loader2, Search, Star, MessageSquare, ArrowUpDown } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { getStore, getProducts, trackClick, getStoreReviews } from "@/lib/api";
import type { Store as StoreType, Product } from "@/lib/api";
import type { Review } from "@/lib/api";

type PriceSort = "none" | "asc" | "desc";

/* ── Category emoji map ──────────────────────────────────── */
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

/* ── Star rating display ─────────────────────────────────── */
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

/* ── Review card ─────────────────────────────────────────── */
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

  const cyclePriceSort = () => {
    setPriceSort(prev =>
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
    );
  };

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

      {/* ── Store Header ──────────────────────────────────────── */}
      <header className="bg-primary text-primary-foreground pt-10 pb-6 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="container max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-lg text-primary">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1.5">{store.name}</h1>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {store.category && (
              <span className="text-primary-foreground/80 bg-black/10 px-3 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm">
                {store.category}
              </span>
            )}
            {avgRating && (
              <span className="bg-amber-400/20 text-amber-100 px-3 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                {avgRating} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Search Bar ───────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3 sm:px-6">
        <div className="container max-w-5xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 rounded-xl border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      <main className="flex-1 container max-w-5xl mx-auto px-2.5 sm:px-6 pt-4 pb-10">

        {/* ── Category Icons ───────────────────────────────────── */}
        {categories.length > 1 && (
          <div className="mb-5 -mx-2.5 sm:mx-0">
            <div
              className="flex gap-3 overflow-x-auto px-2.5 sm:px-0 pb-1 scrollbar-none"
              data-testid="category-icons"
            >
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  data-testid={`filter-cat-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all border-2 ${
                    activeCategory === cat
                      ? "border-primary bg-primary/10 shadow-md scale-105"
                      : "border-border bg-muted/40 hover:border-primary/40 hover:bg-muted"
                  }`}>
                    {getCategoryEmoji(cat)}
                  </div>
                  <span className={`text-[10px] font-medium w-14 text-center leading-tight line-clamp-2 ${
                    activeCategory === cat ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {cat === "All" ? "All Items" : cat.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Sort + Count row ─────────────────────────────────── */}
        {products.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-sm text-muted-foreground font-medium">
              {filteredProducts.length === products.length
                ? `${products.length} item${products.length !== 1 ? "s" : ""}`
                : `${filteredProducts.length} of ${products.length} items`}
              {search && <span className="ml-1">for "<strong>{search}</strong>"</span>}
            </span>
            <button
              onClick={cyclePriceSort}
              data-testid="price-sort-btn"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                priceSort !== "none"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted"
              }`}
            >
              <ArrowUpDown className="h-3 w-3" />
              {priceSort === "asc" ? "Price: Low → High" : priceSort === "desc" ? "Price: High → Low" : "Price"}
            </button>
          </div>
        )}

        {/* ── Product Grid ─────────────────────────────────────── */}
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 mb-10">
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

        {/* ── Reviews Section ──────────────────────────────────── */}
        <div className="border-t pt-8 mt-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Customer Reviews</h2>
            </div>
            {reviews.length > 0 && avgRating && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-foreground">{avgRating}</span>
                <div className="flex flex-col gap-0.5">
                  <StarRating rating={parseFloat(avgRating)} />
                  <span className="text-xs text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl">
              <Star className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No reviews yet</p>
              <p className="text-sm mt-1">Be the first to leave a review after ordering!</p>
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

      <footer className="py-6 text-center text-muted-foreground border-t bg-muted/20 text-sm">
        <p>Powered by <span className="font-bold text-foreground">Advize Store</span></p>
      </footer>
    </div>
  );
}
