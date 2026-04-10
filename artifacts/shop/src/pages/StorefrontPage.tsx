import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { Store, Loader2, SlidersHorizontal, ArrowUpDown, ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { getStore, getProducts, trackClick } from "@/lib/api";
import type { Store as StoreType } from "@/lib/api";
import type { Product } from "@/lib/mock-data";

type PriceSort = "none" | "asc" | "desc";

export function StorefrontPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const slug = params.slug ?? "";

  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [priceSort, setPriceSort] = useState<PriceSort>("none");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const s = await getStore(slug);
        if (cancelled) return;
        setStore(s);
        const prods = await getProducts(s.id);
        if (!cancelled) setProducts(prods);
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

  // Derive unique categories from real product data
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map(p => p.category).filter(Boolean))
    ) as string[];
    return ["All", ...cats];
  }, [products]);

  // Apply category + price filters
  const filteredProducts = useMemo(() => {
    let list = activeCategory === "All"
      ? products
      : products.filter(p => p.category === activeCategory);

    if (priceSort === "asc") list = [...list].sort((a, b) => a.price - b.price);
    if (priceSort === "desc") list = [...list].sort((a, b) => b.price - a.price);

    return list;
  }, [products, activeCategory, priceSort]);

  const cyclePriceSort = () => {
    setPriceSort(prev =>
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
    );
  };

  const priceSortLabel = priceSort === "asc"
    ? "Price: Low → High"
    : priceSort === "desc"
    ? "Price: High → Low"
    : "Price";

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
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* ── Store Header ──────────────────────────────────────── */}
      <header className="bg-primary text-primary-foreground py-12 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="container max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="absolute left-0 top-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back-to-dashboard"
              className="text-primary-foreground hover:bg-white/20 hover:text-primary-foreground gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg text-primary">
            <Store className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{store.name}</h1>
          {store.category && (
            <p className="text-primary-foreground/80 bg-black/10 px-4 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
              {store.category}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 container max-w-5xl mx-auto px-2.5 sm:px-6 py-6 sm:py-10">

        {/* ── Filter Bar ──────────────────────────────────────── */}
        {products.length > 0 && (
          <div className="mb-6 space-y-3">
            {/* Category pills */}
            {categories.length > 1 && (
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" data-testid="category-filters">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      data-testid={`filter-cat-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        activeCategory === cat
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price sort + result count row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground font-medium">
                {filteredProducts.length === products.length
                  ? `${products.length} items`
                  : `${filteredProducts.length} of ${products.length} items`}
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
                {priceSortLabel}
              </button>
            </div>
          </div>
        )}

        {/* ── Product Grid or Empty States ──────────────────── */}
        {products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No products yet</p>
            <p className="text-sm mt-1">This store hasn't added any products yet.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <SlidersHorizontal className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No products in "{activeCategory}"</p>
            <button
              onClick={() => setActiveCategory("All")}
              className="text-sm text-primary font-semibold mt-2 hover:underline"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 pb-20">
            {filteredProducts.map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)}>
                <ProductCard product={product} showActions={false} />
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-muted-foreground border-t bg-muted/20">
        <p>Powered by <span className="font-bold text-foreground">Shop</span></p>
      </footer>
    </div>
  );
}
