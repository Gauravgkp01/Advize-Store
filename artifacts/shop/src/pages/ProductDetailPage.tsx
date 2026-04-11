import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  ArrowLeft, MessageCircle, Tag, CheckCircle2,
  AlertCircle, Star, Loader2, MousePointerClick,
  Package, BarChart2, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MOCK_COUPONS } from "@/lib/mock-data";
import { getProduct, getReviews, createReview, getProductAnalytics, getStore, getProducts } from "@/lib/api";
import type { Product, Review } from "@/lib/mock-data";
import type { ProductAnalytics } from "@/lib/api";

/* ── shared sub-components ────────────────────────────── */
function StarRating({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  const px = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${star} star`}
        >
          <Star className={`${px} transition-colors ${star <= active ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

function AvatarInitials({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-green-100 text-green-700", "bg-rose-100 text-rose-700"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div className="bg-card sm:border sm:rounded-3xl px-5 sm:px-10 py-6 shadow-sm">
      <h2 className="text-lg font-bold mb-4">You may also like</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
        {products.map(p => (
          <Link key={p.id} href={`/product/${p.id}`} className="shrink-0 w-36 snap-start group">
            <div className="rounded-2xl border bg-background overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-primary/30">
              <div className="aspect-square overflow-hidden bg-muted/30 relative">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {p.units === 0 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-[9px] font-bold bg-white text-foreground px-2 py-0.5 rounded-full">Out of Stock</span>
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{p.name}</p>
                <p className="text-sm font-extrabold text-primary mt-1">₹{p.price.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ReviewsList({ reviews, avgRating, ratingCounts, showForm, setShowForm,
  reviewName, setReviewName, reviewRating, setReviewRating, reviewComment,
  setReviewComment, submitting, handleSubmitReview }: any) {
  return (
    <div className="bg-card sm:border sm:rounded-3xl px-5 sm:px-10 py-8 shadow-sm" data-testid="reviews-section">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Customer Reviews</h2>
        {!showForm && (
          <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(true)} data-testid="btn-write-review">
            Write a Review
          </Button>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 mb-8 pb-8 border-b">
          <div className="flex flex-col items-center justify-center gap-1 shrink-0">
            <span className="text-5xl font-extrabold text-foreground">{avgRating.toFixed(1)}</span>
            <StarRating value={Math.round(avgRating)} />
            <span className="text-sm text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex-1 space-y-1.5">
            {ratingCounts.map(({ star, count }: any) => (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-right text-muted-foreground">{star}</span>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : "0%" }} />
                </div>
                <span className="w-4 text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-muted/30 border rounded-2xl p-5 mb-8 space-y-4" data-testid="review-form">
          <h3 className="font-semibold text-base">Share your experience</h3>
          <div className="space-y-1">
            <label className="text-sm font-medium">Your rating</label>
            <StarRating value={reviewRating} onChange={setReviewRating} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Your name</label>
            <Input placeholder="e.g. Priya S." className="h-11 rounded-xl" value={reviewName}
              onChange={e => setReviewName(e.target.value)} data-testid="input-review-name" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Your review</label>
            <Textarea placeholder="What did you like or dislike? How was the quality?"
              className="rounded-xl resize-none min-h-[100px]" value={reviewComment}
              onChange={e => setReviewComment(e.target.value)} data-testid="input-review-comment" />
          </div>
          <div className="flex gap-3">
            <Button className="flex-1 h-11 rounded-xl" onClick={handleSubmitReview} disabled={submitting} data-testid="btn-submit-review">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Post Review
            </Button>
            <Button variant="outline" className="h-11 rounded-xl"
              onClick={() => { setShowForm(false); setReviewRating(0); setReviewName(""); setReviewComment(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review: Review) => (
            <div key={review.id} className="flex gap-4" data-testid={`review-${review.id}`}>
              <AvatarInitials name={review.name} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{review.name}</span>
                  <StarRating value={review.rating} size="sm" />
                  <span className="text-xs text-muted-foreground ml-auto">{review.date}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Owner analytics view ─────────────────────────────── */
function OwnerView({ product, reviews, analytics }: {
  product: Product;
  reviews: Review[];
  analytics: ProductAnalytics | null;
}) {
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star, count: reviews.filter(r => r.rating === star).length,
  }));
  const hasClicks = (analytics?.totalClicks ?? 0) > 0;

  const CustomTooltip = ({ active, payload, label }: any) =>
    active && payload?.length ? (
      <div className="bg-card border rounded-xl px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold">{label}</p>
        <p className="text-primary font-bold">{payload[0].value} clicks</p>
      </div>
    ) : null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <p className="font-semibold text-sm leading-tight">{product.name}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Product Analytics</p>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-4xl mx-auto px-0 sm:px-6 py-0 sm:py-8 space-y-4 pb-10">

        {/* Product identity card */}
        <div className="bg-card sm:border sm:rounded-3xl overflow-hidden shadow-sm flex flex-row items-center gap-4 p-4 sm:p-6">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-muted shrink-0">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full mb-1">
              {product.category}
            </span>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{product.name}</h1>
            <p className="text-xl font-extrabold text-primary mt-1">₹{product.price.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* 3 stat tiles */}
        <div className="grid grid-cols-3 gap-2 px-2.5 sm:px-0">
          <div className="bg-card border rounded-2xl p-3 flex flex-col gap-1">
            <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center">
              <MousePointerClick className="h-3.5 w-3.5 text-sky-600" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Total Clicks</p>
            <p className="text-base font-extrabold text-foreground">{(analytics?.totalClicks ?? 0).toLocaleString()}</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 flex flex-col gap-1">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
              <Star className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Avg Rating</p>
            <p className="text-base font-extrabold text-foreground">
              {reviews.length ? avgRating.toFixed(1) + " ★" : "–"}
            </p>
          </div>
          <div className={`bg-card border rounded-2xl p-3 flex flex-col gap-1 ${product.units === 0 ? "border-red-200 bg-red-50" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${product.units === 0 ? "bg-red-100" : "bg-green-100"}`}>
              <Package className={`h-3.5 w-3.5 ${product.units === 0 ? "text-red-600" : "text-green-600"}`} />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Stock</p>
            <p className={`text-base font-extrabold ${product.units === 0 ? "text-red-600" : "text-foreground"}`}>
              {product.units === 0 ? "Out" : `${product.units} units`}
            </p>
          </div>
        </div>

        {/* Weekly clicks chart */}
        <div className="mx-2.5 sm:mx-0 bg-card border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Clicks This Week</p>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">How many times buyers clicked this product in the last 7 days</p>

          {!hasClicks ? (
            <div className="flex flex-col items-center justify-center h-[120px] text-muted-foreground/40 gap-2">
              <BarChart2 className="h-7 w-7" />
              <p className="text-xs">No clicks yet — share your store to get started!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={analytics?.weeklyClicks ?? []} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="prodClickGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="clicks" stroke="#22c55e" strokeWidth={2}
                  fill="url(#prodClickGrad)" dot={{ r: 3, fill: "#22c55e" }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Product description (read-only for owner) */}
        {product.description && (
          <div className="mx-2.5 sm:mx-0 bg-card border rounded-2xl p-4">
            <p className="text-sm font-semibold mb-2">Product Description</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Reviews (read-only for owner) */}
        <div className="mx-2.5 sm:mx-0 bg-card border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">Customer Reviews ({reviews.length})</p>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No reviews yet for this product</p>
            </div>
          ) : (
            <>
              {/* Rating breakdown */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 pb-6 border-b">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-4xl font-extrabold">{avgRating.toFixed(1)}</span>
                  <StarRating value={Math.round(avgRating)} size="sm" />
                  <span className="text-xs text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  {ratingCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-right text-muted-foreground">{star}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : "0%" }} />
                      </div>
                      <span className="w-4 text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual reviews */}
              <div className="space-y-5">
                {reviews.map(review => (
                  <div key={review.id} className="flex gap-3">
                    <AvatarInitials name={review.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{review.name}</span>
                        <StarRating value={review.rating} size="sm" />
                        <span className="text-xs text-muted-foreground ml-auto">{review.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="pb-8" />
      </main>
    </div>
  );
}

/* ── Buyer (public) view ──────────────────────────────── */
function BuyerView({ product, reviews, storeWhatsapp, storeSlug, relatedProducts }: {
  product: Product;
  reviews: Review[];
  storeWhatsapp: string;
  storeSlug: string;
  relatedProducts: Product[];
}) {
  const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";

  // Always show the product/store page in light mode
  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => { if (wasDark) html.classList.add("dark"); };
  }, []);

  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);

  useEffect(() => { setLocalReviews(reviews); }, [reviews]);

  const avgRating = localReviews.length
    ? localReviews.reduce((s, r) => s + r.rating, 0) / localReviews.length : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star, count: localReviews.filter(r => r.rating === star).length,
  }));
  const finalPrice = appliedDiscount ? product.price * (1 - appliedDiscount / 100) : product.price;

  const handleSelectVariant = (label: string, value: string) =>
    setSelectedVariants(prev => ({ ...prev, [label]: prev[label] === value ? "" : value }));

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

  const handleOrder = () => {
    const variantSummary = product.variants?.filter(v => selectedVariants[v.label])
      .map(v => `${v.label}: ${selectedVariants[v.label]}`).join(", ");
    const variantText = variantSummary ? ` (${variantSummary})` : "";
    const couponText = appliedDiscount ? ` I've applied the ${couponCode.toUpperCase()} coupon.` : "";
    const text = `Hi! I'd like to order: ${product.name}${variantText} (Price: ₹${finalPrice.toLocaleString("en-IN")}).${couponText}`;
    const number = storeWhatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSubmitReview = async () => {
    if (!reviewName.trim()) { toast({ variant: "destructive", title: "Please enter your name." }); return; }
    if (reviewRating === 0) { toast({ variant: "destructive", title: "Please select a star rating." }); return; }
    if (!reviewComment.trim()) { toast({ variant: "destructive", title: "Please write a short review." }); return; }
    setSubmitting(true);
    try {
      const newReview = await createReview({ product_id: product.id, name: reviewName.trim(), rating: reviewRating, comment: reviewComment.trim() });
      setLocalReviews(prev => [newReview, ...prev]);
      setReviewName(""); setReviewRating(0); setReviewComment(""); setShowForm(false);
      toast({ title: "Review posted!", description: "Thanks for sharing your feedback." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to post review", description: e.message });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center">
          <span className="font-semibold text-lg">Product Details</span>
        </div>
      </header>

      <main className="flex-1 container max-w-4xl mx-auto px-0 sm:px-6 py-0 sm:py-8 space-y-6">
        <div className="bg-card sm:border sm:rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 aspect-square md:aspect-auto md:min-h-[500px] relative bg-muted">
            <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col gap-5">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-muted/50 text-muted-foreground w-fit">
              {product.category}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-primary">
                  ₹{finalPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
                {appliedDiscount && (
                  <span className="text-lg text-muted-foreground line-through">₹{product.price.toLocaleString("en-IN")}</span>
                )}
              </div>
              {localReviews.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <StarRating value={Math.round(avgRating)} size="sm" />
                  <span className="text-sm text-muted-foreground">
                    {avgRating.toFixed(1)} · {localReviews.length} review{localReviews.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{product.description}</p>

            {product.variants && product.variants.length > 0 && (
              <div className="space-y-4" data-testid="variants-section">
                {product.variants.map(variant => (
                  <div key={variant.label}>
                    <p className="text-sm font-semibold mb-2">
                      {variant.label}
                      {selectedVariants[variant.label] && (
                        <span className="ml-2 font-normal text-muted-foreground">— {selectedVariants[variant.label]}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variant.values.map(value => {
                        const isSelected = selectedVariants[variant.label] === value;
                        return (
                          <button key={value} type="button" onClick={() => handleSelectVariant(variant.label, value)}
                            className={`h-9 px-4 rounded-full border text-sm font-medium transition-all ${isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/60 hover:bg-muted/50"}`}>
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {product.units === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>This item is currently out of stock. You can still message the seller.</span>
              </div>
            )}

            <div className="pt-4 border-t space-y-3">
              <h3 className="font-semibold flex items-center text-sm"><Tag className="w-4 h-4 mr-2" /> Have a coupon?</h3>
              {appliedDiscount ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center text-green-700 dark:text-green-400 font-medium">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {couponCode.toUpperCase()} applied ({appliedDiscount}% off)
                  </div>
                  <Button variant="ghost" size="sm" className="text-green-700 dark:text-green-400 hover:text-green-800 hover:bg-green-100"
                    onClick={() => { setAppliedDiscount(null); setCouponCode(""); }}>Remove</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="ENTER CODE" className="h-12 rounded-xl uppercase" value={couponCode}
                    onChange={e => setCouponCode(e.target.value)} data-testid="input-coupon" />
                  <Button variant="secondary" className="h-12 px-6 rounded-xl" onClick={handleApplyCoupon} data-testid="btn-apply-coupon">Apply</Button>
                </div>
              )}
            </div>

            <Button className="w-full h-14 text-lg rounded-xl shadow-lg bg-green-600 hover:bg-green-700 text-white border-transparent"
              onClick={handleOrder} data-testid="btn-order-whatsapp">
              <MessageCircle className="mr-2 h-5 w-5" />
              Order on WhatsApp
            </Button>
          </div>
        </div>

        {!isPreview && <RelatedProducts products={relatedProducts} />}

        <ReviewsList reviews={localReviews} avgRating={avgRating} ratingCounts={ratingCounts}
          showForm={showForm} setShowForm={setShowForm} reviewName={reviewName} setReviewName={setReviewName}
          reviewRating={reviewRating} setReviewRating={setReviewRating} reviewComment={reviewComment}
          setReviewComment={setReviewComment} submitting={submitting} handleSubmitReview={handleSubmitReview} />

        <div className="pb-8" />
      </main>
    </div>
  );
}

/* ── Main page component ──────────────────────────────── */
export function ProductDetailPage() {
  const { id } = useParams();

  // Detect owner mode from query string
  const isOwnerView = new URLSearchParams(window.location.search).get("from") === "dashboard";

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [storeWhatsapp, setStoreWhatsapp] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const fetchList: Promise<any>[] = [getProduct(id!), getReviews(id!)];
        if (isOwnerView) fetchList.push(getProductAnalytics(id!));

        const results = await Promise.all(fetchList);
        if (cancelled) return;

        setProduct(results[0]);
        setReviews(results[1]);
        if (isOwnerView && results[2]) setProductAnalytics(results[2]);

        // Load store info for WhatsApp + back link + related products (buyer view only)
        if (!isOwnerView) {
          const savedSlug = localStorage.getItem("shop_store_slug");
          if (savedSlug) {
            setStoreSlug(savedSlug);
            const s = await getStore(savedSlug);
            if (!cancelled) {
              setStoreWhatsapp(s.whatsapp ?? "");
              // Fetch all store products and filter to same category
              const loadedProduct = results[0] as Product;
              try {
                const allProducts = await getProducts(s.id);
                if (!cancelled) {
                  const related = allProducts
                    .filter(p => p.id !== loadedProduct.id && p.category === loadedProduct.category)
                    .slice(0, 6);
                  setRelatedProducts(related);
                }
              } catch {
                // non-critical, ignore
              }
            }
          }
        }
      } catch {
        // product not found — leave null
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, isOwnerView]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground">
        <p>Product not found.</p>
      </div>
    );
  }

  if (isOwnerView) {
    return <OwnerView product={product} reviews={reviews} analytics={productAnalytics} />;
  }

  return (
    <BuyerView product={product} reviews={reviews} storeWhatsapp={storeWhatsapp} storeSlug={storeSlug} relatedProducts={relatedProducts} />
  );
}
