import { Link } from "wouter";
import { Copy, Share, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MOCK_STORE_INFO, MOCK_REVIEWS, type Product } from "@/lib/mock-data";

interface ProductCardProps {
  product: Product;
  showActions?: boolean;
  onDelete?: () => void;
  productHref?: string;
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

export function ProductCard({ product, showActions = true, productHref, onDelete }: ProductCardProps) {
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
      <Link href={productHref ?? `/product/${product.id}`} className="group block" data-testid={`card-product-${product.id}`}>
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

  /* ── DASHBOARD (seller view) – compact 2-col friendly ── */
  return (
    <Link href={productHref ?? `/product/${product.id}`} className="group block" data-testid={`card-product-${product.id}`}>
      <div className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full hover:border-primary/20">
        {/* Image */}
        <div className="aspect-square relative overflow-hidden bg-muted/30">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {/* Stock badge */}
          <div
            className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-semibold shadow-sm ${
              inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
            }`}
            data-testid={`badge-stock-${product.id}`}
          >
            {inStock ? "In Stock" : "Out of Stock"}
          </div>
        </div>

        {/* Info */}
        <div className="p-2 sm:p-3 flex-1 flex flex-col gap-0.5 sm:gap-1">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {product.name}
          </h3>
          <p className="text-sm sm:text-base font-extrabold text-primary leading-tight">
            ₹{product.price.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground" data-testid={`text-units-${product.id}`}>
            {inStock ? `${product.units} unit${product.units !== 1 ? "s" : ""} left` : "No stock"}
          </p>
        </div>

        {/* Actions */}
        <div className="px-2 pb-2 sm:px-3 sm:pb-3 flex items-center gap-1.5 border-t border-border/40 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg h-7 sm:h-8 text-[10px] sm:text-xs px-1 bg-background hover:bg-muted"
            onClick={handleCopyLink}
            data-testid={`btn-copy-${product.id}`}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg h-7 sm:h-8 text-[10px] sm:text-xs px-1 bg-background hover:bg-muted"
            onClick={handleShare}
            data-testid={`btn-share-${product.id}`}
          >
            <Share className="h-3 w-3 mr-1" />
            Share
          </Button>
        </div>
      </div>
    </Link>
  );
}
