import { Link } from "wouter";
import { Copy, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MOCK_STORE_INFO, type Product } from "@/lib/mock-data";

interface ProductCardProps {
  product: Product;
  showActions?: boolean;
}

export function ProductCard({ product, showActions = true }: ProductCardProps) {
  const { toast } = useToast();
  const inStock = product.units > 0;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/product/${product.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Product link copied to clipboard.",
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "Share sheet opened",
      description: "Ready to share with your customers.",
    });
  };

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
          {showActions && (
            <div
              className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
                inStock
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
              data-testid={`badge-stock-${product.id}`}
            >
              {inStock ? "In Stock" : "Out of Stock"}
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-lg text-foreground line-clamp-1 mb-1">{product.name}</h3>
          <p className="text-xl font-bold text-primary mb-1">₹{product.price.toLocaleString("en-IN")}</p>

          {showActions && (
            <p className="text-sm text-muted-foreground mb-3" data-testid={`text-units-${product.id}`}>
              {inStock ? `${product.units} unit${product.units !== 1 ? "s" : ""} available` : "No stock left"}
            </p>
          )}

          <div className="mt-auto">
            {showActions ? (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
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
            ) : (
              <Button
                className="w-full rounded-xl shadow-none group-hover:shadow-sm transition-all bg-primary/10 text-primary hover:bg-primary hover:text-white"
                variant="secondary"
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
