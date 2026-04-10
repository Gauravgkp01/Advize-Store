import { Link } from "wouter";
import { Copy, Share, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MOCK_STORE_INFO, MOCK_REVIEWS, type Product } from "@/lib/mock-data";

interface ProductCardProps {
  product: Product;
  showActions?: boolean;
}

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
        <span>{rating.toFixed(1)}</span>
        <Star className="h-2.5 w-2.5 fill-white" />
      </div>
      <span className="text-[10px] text-muted-foreground">({count})</span>
    </div>
  );
}

export function ProductCard({ product, showActions = true }: ProductCardProps) {
  const { toast } = useToast();
  const inStock = product.units > 0;

  const reviews = MOCK_REVIEWS[product.id] || [];
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/product/${product.id}`);
    toast({ title: "Link copied!", description: "Product link copied to clipboard." });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({ title: "Share sheet opened", description: "Ready to share with your customers." });
  };

  /* ── STOREFRONT (buyer view) – compact Flipkart-style ── */
  if (!showActions) {
    return (
      <Link href={`/product/${product.id}`} className="group block" data-testid={`card-product-${product.id}`}>
        <div className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full hover:border-primary/20">
          {/* Image */}
          <div className="aspect-square relative overflow-hidden bg-muted/30">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {/* Category badge */}
            <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-foreground shadow-sm leading-tight">
              {product.category}
            </div>
            {/* Out-of-stock overlay */}
            {!inStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-white text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-2 flex-1 flex flex-col gap-1">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug">
              {product.name}
            </h3>

            <p className="text-sm sm:text-base font-extrabold text-primary leading-tight">
              ₹{product.price.toLocaleString("en-IN")}
            </p>

            {reviews.length > 0 && (
              <StarRow rating={avgRating} count={reviews.length} />
            )}

            {product.variants && product.variants.length > 0 && (
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                {product.variants.map(v => v.label).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  /* ── DASHBOARD (seller view) – full card with actions ── */
  return (
    <Link href={`/product/${product.id}`} className="group block" data-testid={`card-product-${product.id}`}>
      <div className="bg-card rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full hover:border-primary/20">
        <div className="aspect-square relative overflow-hidden bg-muted/30">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-foreground shadow-sm">
            {product.category}
          </div>
          <div
            className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
              inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
            }`}
            data-testid={`badge-stock-${product.id}`}
          >
            {inStock ? "In Stock" : "Out of Stock"}
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-lg text-foreground line-clamp-1 mb-1">{product.name}</h3>
          <p className="text-xl font-bold text-primary mb-1">₹{product.price.toLocaleString("en-IN")}</p>
          <p className="text-sm text-muted-foreground mb-3" data-testid={`text-units-${product.id}`}>
            {inStock ? `${product.units} unit${product.units !== 1 ? "s" : ""} available` : "No stock left"}
          </p>

          <div className="mt-auto flex items-center gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl bg-background hover:bg-muted"
              onClick={handleCopyLink}
              data-testid={`btn-copy-${product.id}`}
            >
              <Copy className="h-4 w-4 mr-1.5" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl bg-background hover:bg-muted"
              onClick={handleShare}
              data-testid={`btn-share-${product.id}`}
            >
              <Share className="h-4 w-4 mr-1.5" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
