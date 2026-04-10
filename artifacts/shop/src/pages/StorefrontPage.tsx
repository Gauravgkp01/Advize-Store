import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Store, ArrowLeft, Loader2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { getStore, getProducts, trackClick } from "@/lib/api";
import type { Store as StoreType } from "@/lib/api";
import type { Product } from "@/lib/mock-data";

export function StorefrontPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const slug = params.slug ?? "";

  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <main className="flex-1 container max-w-5xl mx-auto px-2.5 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">All Products</h2>
          <span className="text-muted-foreground text-sm font-medium bg-muted px-3 py-1 rounded-full">
            {products.length} items
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No products yet</p>
            <p className="text-sm mt-1">This store hasn't added any products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 pb-20">
            {products.map((product) => (
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
