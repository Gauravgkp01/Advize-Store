import { useParams, useLocation } from "wouter";
import { Store, ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { MOCK_PRODUCTS, MOCK_STORE_INFO } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export function StorefrontPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const slug = params.slug || MOCK_STORE_INFO.slug;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Store Header */}
      <header className="bg-primary text-primary-foreground py-12 px-4 sm:px-6 relative overflow-hidden">
        {/* Decorative background element */}
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{MOCK_STORE_INFO.name}</h1>
          <p className="text-primary-foreground/80 bg-black/10 px-4 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
            {MOCK_STORE_INFO.category}
          </p>
        </div>
      </header>

      <main className="flex-1 container max-w-5xl mx-auto px-2.5 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">All Products</h2>
          <span className="text-muted-foreground text-sm font-medium bg-muted px-3 py-1 rounded-full">
            {MOCK_PRODUCTS.length} items
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 pb-20">
          {MOCK_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} showActions={false} />
          ))}
        </div>
      </main>

      <footer className="py-8 text-center text-muted-foreground border-t bg-muted/20">
        <p>Powered by <span className="font-bold text-foreground">Shop</span></p>
      </footer>
    </div>
  );
}
