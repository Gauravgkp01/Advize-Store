import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, MessageCircle, Tag, CheckCircle2, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MOCK_PRODUCTS, MOCK_STORE_INFO, MOCK_COUPONS } from "@/lib/mock-data";

export function ProductDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const product = MOCK_PRODUCTS.find(p => p.id === id) || MOCK_PRODUCTS[0];

  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);

  // Track one selected value per variant group (keyed by label)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const handleSelectVariant = (label: string, value: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [label]: prev[label] === value ? "" : value,
    }));
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const discount = MOCK_COUPONS[couponCode.toUpperCase() as keyof typeof MOCK_COUPONS];
    if (discount) {
      setAppliedDiscount(discount);
      toast({ title: "Coupon applied!", description: `You got ${discount}% off on this order.` });
    } else {
      toast({ variant: "destructive", title: "Invalid coupon", description: "Please check the code and try again." });
    }
  };

  const finalPrice = appliedDiscount
    ? product.price * (1 - appliedDiscount / 100)
    : product.price;

  const handleOrder = () => {
    const variantSummary = product.variants
      ?.filter(v => selectedVariants[v.label])
      .map(v => `${v.label}: ${selectedVariants[v.label]}`)
      .join(", ");

    const variantText = variantSummary ? ` (${variantSummary})` : "";
    const couponText = appliedDiscount ? ` I've applied the ${couponCode.toUpperCase()} coupon.` : "";
    const text = `Hi! I'd like to order: ${product.name}${variantText} (Price: ₹${finalPrice.toLocaleString("en-IN")}).${couponText}`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${MOCK_STORE_INFO.whatsapp.replace(/[^0-9]/g, '')}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Button variant="ghost" size="icon" asChild className="rounded-full mr-2">
            <Link href={`/store/${MOCK_STORE_INFO.slug}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <span className="font-semibold text-lg">{MOCK_STORE_INFO.name}</span>
        </div>
      </header>

      <main className="flex-1 container max-w-4xl mx-auto px-0 sm:px-6 py-0 sm:py-8">
        <div className="bg-card sm:border sm:rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row">
          {/* Product Image */}
          <div className="w-full md:w-1/2 aspect-square md:aspect-auto md:min-h-[500px] relative bg-muted">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Product Details */}
          <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col gap-5">

            {/* Category badge */}
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-muted/50 text-muted-foreground w-fit">
              {product.category}
            </div>

            {/* Name + Price */}
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-primary">
                  ₹{finalPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
                {appliedDiscount && (
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              {product.description}
            </p>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-4" data-testid="variants-section">
                {product.variants.map(variant => (
                  <div key={variant.label}>
                    <p className="text-sm font-semibold mb-2">
                      {variant.label}
                      {selectedVariants[variant.label] && (
                        <span className="ml-2 font-normal text-muted-foreground">
                          — {selectedVariants[variant.label]}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variant.values.map(value => {
                        const isSelected = selectedVariants[variant.label] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleSelectVariant(variant.label, value)}
                            data-testid={`variant-${variant.label}-${value}`}
                            className={`h-9 px-4 rounded-full border text-sm font-medium transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground border-border hover:border-primary/60 hover:bg-muted/50"
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Out of stock notice */}
            {product.units === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800" data-testid="out-of-stock-notice">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>This item is currently out of stock. You can still message the seller.</span>
              </div>
            )}

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3" data-testid="product-location">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span>Available at <span className="font-medium text-foreground">{MOCK_STORE_INFO.location}</span></span>
            </div>

            {/* Coupon */}
            <div className="pt-4 border-t space-y-3">
              <h3 className="font-semibold flex items-center text-sm">
                <Tag className="w-4 h-4 mr-2" /> Have a coupon?
              </h3>

              {appliedDiscount ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center text-green-700 dark:text-green-400 font-medium">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {couponCode.toUpperCase()} applied ({appliedDiscount}% off)
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-700 dark:text-green-400 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900/40"
                    onClick={() => { setAppliedDiscount(null); setCouponCode(""); }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="ENTER CODE"
                    className="h-12 rounded-xl uppercase"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    data-testid="input-coupon"
                  />
                  <Button
                    variant="secondary"
                    className="h-12 px-6 rounded-xl"
                    onClick={handleApplyCoupon}
                    data-testid="btn-apply-coupon"
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* WhatsApp Order */}
            <Button
              className="w-full h-14 text-lg rounded-xl shadow-lg bg-green-600 hover:bg-green-700 text-white border-transparent"
              onClick={handleOrder}
              data-testid="btn-order-whatsapp"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Order on WhatsApp
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
