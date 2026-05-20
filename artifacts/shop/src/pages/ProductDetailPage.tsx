import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  ArrowLeft, MessageCircle, ExternalLink,
  AlertCircle, Star, Loader2, MousePointerClick,
  Package, BarChart2, TrendingUp, ZoomIn, ZoomOut, X, RotateCcw,
  ShoppingCart, ShoppingBag, ChevronDown, Heart, Share2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DescriptionRenderer } from "@/components/DescriptionRenderer";
import { useToast } from "@/hooks/use-toast";
import { useStorefrontTheme } from "@/hooks/use-storefront-theme";
import { getProduct, getReviews, createReview, getProductAnalytics, getStore, getStoreById, getProducts, getSubdomainSlug, getProductDetail, getRelatedProducts } from "@/lib/api";
import type { Product, Review, MixCartData } from "@/lib/api";
import type { ProductAnalytics } from "@/lib/api";
import { pdCache, PD_CACHE_TTL } from "@/lib/product-cache";
import { useCart } from "@/contexts/CartContext";
import { setSEO, resetSEO, injectProductJsonLd, removeProductJsonLd } from "@/lib/seo";

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
                {(() => {
                  const isMix = p.productType === "mix_match";
                  const displayPrice = isMix && p.pricingTiers && p.pricingTiers.length > 0
                    ? Math.min(...p.pricingTiers.map(t => t.price))
                    : (p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price);
                  const hasSale = !isMix && p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price;
                  return (
                    <div className="mt-1">
                      <p className="text-sm font-extrabold text-primary">₹{displayPrice.toLocaleString("en-IN")}</p>
                      {hasSale && (
                        <p className="text-[10px] text-muted-foreground line-through leading-none mt-0.5">₹{p.price.toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  );
                })()}
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
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
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
            <p className="text-sm font-semibold mb-3">Product Description</p>
            <DescriptionRenderer text={product.description} />
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

/* ── Zoomable image lightbox ──────────────────────────── */
function ZoomableImage({ src, alt, imgClassName }: { src: string; alt: string; imgClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastDist = useRef<number | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);

  const clampScale = (s: number) => Math.min(5, Math.max(1, s));

  const reset = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };
  const close = () => { setOpen(false); reset(); };
  const zoomIn  = () => setScale(s => clampScale(s + 0.5));
  const zoomOut = () => setScale(s => {
    const next = clampScale(s - 0.5);
    if (next === 1) setTranslate({ x: 0, y: 0 });
    return next;
  });

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => clampScale(s - e.deltaY * 0.005));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
    } else {
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragging.current = true;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setScale(s => clampScale(s * (dist / lastDist.current!)));
      lastDist.current = dist;
    } else if (e.touches.length === 1 && lastPos.current && dragging.current) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      setTranslate(t => ({ x: t.x + dx, y: t.y + dy }));
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onTouchEnd = () => {
    lastDist.current = null;
    lastPos.current = null;
    dragging.current = false;
  };

  return (
    <>
      {/* Main image – click to open lightbox */}
      <div
        className="relative w-full cursor-zoom-in select-none bg-muted/20"
        onClick={() => setOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className={imgClassName ?? "w-full object-contain object-top max-h-[88vw] sm:max-h-[520px]"}
          draggable={false}
        />
        <div className="absolute bottom-2 right-2 bg-black/40 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1 pointer-events-none">
          <ZoomIn className="w-3 h-3" /> Tap to zoom
        </div>
      </div>

      {/* Lightbox */}
      {open && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col touch-none" style={{ userSelect: "none" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <span className="text-white/60 text-sm truncate max-w-[70%]">{alt}</span>
            <button
              onClick={close}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Zoomable image area */}
          <div
            className="flex-1 overflow-hidden flex items-center justify-center"
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="select-none"
              style={{
                maxWidth: "100vw",
                maxHeight: "100%",
                objectFit: "contain",
                transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                transition: dragging.current ? "none" : "transform 0.15s ease",
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 py-4 shrink-0">
            <button
              onClick={zoomOut}
              disabled={scale <= 1}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-sm font-semibold w-14 text-center tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 5}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            {scale > 1 && (
              <button
                onClick={reset}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Mix & Match buyer UI ─────────────────────────────── */
function MixMatchBuyerView({ product, storeWhatsapp, storeSlug, storeId, hasPayment }: {
  product: Product;
  storeWhatsapp: string;
  storeSlug: string;
  storeId: string;
  hasPayment: boolean;
}) {
  const onSubdomain = !!getSubdomainSlug();
  const cartPath = onSubdomain ? "/cart" : `/store/${storeSlug}/cart`;
  const { addMixItem, totalItems } = useCart();
  const { toast } = useToast();

  const tiers = [...(product.pricingTiers ?? [])].sort((a, b) => a.quantity - b.quantity);
  const options = product.mixOptions ?? [];
  const inventory = product.mixInventory ?? {};
  const attrLabel = product.mixAttributeLabel || "Options";

  const [selectedTier, setSelectedTier] = useState<{ quantity: number; price: number } | null>(null);
  const [composition, setComposition] = useState<Record<string, number>>({});
  const [addedToCart, setAddedToCart] = useState(false);

  const totalSelected = Object.values(composition).reduce((s, n) => s + n, 0);
  const tierQty = selectedTier?.quantity ?? 0;
  const remaining = tierQty - totalSelected;
  const hasOptions = options.length > 0;
  const isComplete = selectedTier !== null && (!hasOptions || remaining === 0);
  const canAddToCart = selectedTier !== null;

  const selectTier = (tier: { quantity: number; price: number }) => {
    setSelectedTier(tier);
    setComposition({});
  };

  const adjust = (option: string, delta: number) => {
    const current = composition[option] ?? 0;
    const stock = inventory[option] ?? 0;
    if (delta > 0 && remaining <= 0) return;
    if (delta > 0 && current >= stock) return;
    if (delta < 0 && current <= 0) return;
    setComposition(prev => ({ ...prev, [option]: current + delta }));
  };

  const handleAddToCart = () => {
    if (!isComplete || !selectedTier) return;
    const comp = options
      .map(opt => ({ option: opt, qty: composition[opt] ?? 0 }))
      .filter(c => c.qty > 0);
    const mixData: MixCartData = { selectedTier, composition: comp };
    addMixItem(product, storeId, storeSlug, mixData);
    setAddedToCart(true);
    toast({ title: "Pack added to cart!", description: `${product.name} added. Tap the cart to checkout.` });
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!storeWhatsapp) return;
    const tierText = selectedTier
      ? `Pack of ${selectedTier.quantity} @ \u20b9${selectedTier.price}`
      : "No pack selected";
    const compText = isComplete
      ? options.filter(o => (composition[o] ?? 0) > 0).map(o => `${o} \u00d7${composition[o]}`).join(", ")
      : "Not customized yet";
    const message = `Hello \ud83d\udc4b,\n\nI want to order:\n\ud83d\uded2 Product: ${product.name}\n\ud83d\udce6 Pack: ${tierText}\n\ud83c\udfa8 Mix: ${compText}\n\n\ud83d\udd17 Link: ${window.location.href}\n\nPlease confirm availability!`;
    const number = storeWhatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Step 1: Tier selector */}
      <div>
        <p className="text-sm font-semibold mb-4">Step 1: Choose a Pack</p>
        <div className="grid grid-cols-3 gap-2">
          {(() => {
            const base = tiers[0];
            const basePerUnit = base ? base.price / base.quantity : 0;
            return tiers.map(tier => {
              const isSelected = selectedTier?.quantity === tier.quantity;
              const originalPrice = Math.round(basePerUnit * tier.quantity);
              const hasSaving = tier.quantity !== base?.quantity && originalPrice > tier.price;
              const savePct = hasSaving ? Math.round((originalPrice - tier.price) / originalPrice * 100) : 0;
              return (
                <button key={tier.quantity} type="button" onClick={() => selectTier(tier)}
                  className={`flex flex-col items-center w-full pt-4 pb-2 px-1 rounded-xl border-2 transition-all relative overflow-visible ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-background hover:border-primary/50"
                  }`}>
                  {hasSaving && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap z-10">
                      Save {savePct}%
                    </span>
                  )}
                  <span className={`font-bold text-xs leading-tight text-center ${isSelected ? "text-primary" : ""}`}>
                    {tier.quantity} pc{tier.quantity !== 1 ? "s" : ""}
                  </span>
                  {hasSaving && (
                    <span className="text-[10px] text-muted-foreground line-through leading-snug mt-0.5">
                      &#8377;{originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  <span className={`text-sm font-extrabold mt-0.5 leading-tight ${isSelected ? "text-primary" : hasSaving ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                    &#8377;{tier.price.toLocaleString("en-IN")}
                  </span>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Step 2: Composition (optional) */}
      {selectedTier && hasOptions && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">
              Step 2: Choose Your {attrLabel}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
            </p>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isComplete && totalSelected > 0
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {totalSelected === 0 ? "Skip or customize" : remaining > 0 ? `${remaining} more` : "Pack complete!"}
            </span>
          </div>
          <div className="border rounded-2xl overflow-hidden">
            {options.map((option, idx) => {
              const qty = composition[option] ?? 0;
              const stock = inventory[option] ?? 0;
              const canAdd = remaining > 0 && qty < stock;
              return (
                <div key={option}
                  className={`flex items-center gap-3 px-4 py-3 ${idx < options.length - 1 ? "border-b" : ""}`}>
                  <span className="flex-1 text-sm font-medium">{option}</span>
                  <span className="text-xs text-muted-foreground w-14 text-right shrink-0">
                    {stock} avail
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => adjust(option, -1)} disabled={qty === 0}
                      className="w-8 h-8 rounded-full border flex items-center justify-center text-base font-bold transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                      &#8722;
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
                    <button type="button" onClick={() => adjust(option, 1)} disabled={!canAdd}
                      className="w-8 h-8 rounded-full border flex items-center justify-center text-base font-bold transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                      &#43;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {totalSelected} / {tierQty} selected &bull; &#8377;{selectedTier.price.toLocaleString("en-IN")} per pack
          </p>
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex gap-3">
        {hasPayment && (
          <Button
            className="flex-1 h-14 text-base rounded-xl shadow-lg bg-orange-500 hover:bg-orange-600 text-white border-transparent font-semibold gap-2"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            data-testid="btn-add-to-cart">
            <ShoppingBag className={`h-5 w-5 ${addedToCart ? "fill-white" : ""}`} />
            {addedToCart ? "Added!" : "Add to Cart"}
          </Button>
        )}
        <Button
          className={`${hasPayment ? "flex-1" : "w-full"} h-14 text-base rounded-xl shadow-lg bg-green-600 hover:bg-green-700 text-white border-transparent gap-2 font-semibold`}
          onClick={handleWhatsApp}
          data-testid="btn-order-whatsapp">
          <MessageCircle className="h-5 w-5" />
          {hasPayment ? "WhatsApp" : "Order on WhatsApp"}
        </Button>
      </div>

      {/* View Cart pill */}
      {hasPayment && storeSlug && totalItems > 0 && (
        <Link href={cartPath}
          className="flex items-center justify-between gap-3 bg-primary/10 hover:bg-primary/15 border border-primary/30 rounded-2xl px-4 py-2.5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-primary">View Cart</span>
            <span className="bg-primary text-primary-foreground text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
              {totalItems}
            </span>
          </div>
          <ArrowLeft className="h-3.5 w-3.5 text-primary rotate-180 shrink-0" />
        </Link>
      )}
    </div>
  );
}

/* ── Buyer (public) view ──────────────────────────────── */
function BuyerView({ product, reviews, storeWhatsapp, storeSlug, storeId, relatedProducts, hasPayment, storefrontTheme }: {
  product: Product;
  reviews: Review[];
  storeWhatsapp: string;
  storeSlug: string;
  storeId: string;
  relatedProducts: Product[];
  hasPayment: boolean;
  storefrontTheme?: string;
}) {
  const onSubdomain = !!getSubdomainSlug();
  const storePath = onSubdomain ? "/" : `/store/${storeSlug}`;
  const cartPath  = onSubdomain ? "/cart" : `/store/${storeSlug}/cart`;
  useStorefrontTheme(storefrontTheme);

  // ── Dynamic SEO ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!product || !storeSlug) return;
    const productUrl = `https://store.advize.in/product/${product.id}`;
    const effectivePrice = (product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price)
      ? product.salePrice : product.price;
    setSEO({
      title: `${product.name} — ${storeSlug} | Advize Store`,
      description: product.description?.trim()
        ? product.description.trim().slice(0, 160)
        : `Buy ${product.name} for ₹${effectivePrice.toLocaleString("en-IN")} online. Order directly on WhatsApp.`,
      image: product.imageUrl,
      url: productUrl,
      type: "product",
    });
    injectProductJsonLd({
      name: product.name,
      description: product.description,
      image: product.imageUrl,
      price: effectivePrice,
      availability: product.units === 0 ? "OutOfStock" : "InStock",
      url: productUrl,
      storeName: storeSlug,
    });
    return () => {
      resetSEO();
      removeProductJsonLd();
    };
  }, [product, storeSlug]);

  const { toast } = useToast();
  const { addItem, totalItems } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const images = product.imageUrls.length > 0 ? product.imageUrls : [product.imageUrl];
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsFetched, setReviewsFetched] = useState(reviews.length > 0);
  const [reviewsFetching, setReviewsFetching] = useState(false);

  const [liked, setLiked] = useState(() => {
    try { return localStorage.getItem(`liked_${product.id}`) === "1"; } catch { return false; }
  });
  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    try { localStorage.setItem(`liked_${product.id}`, next ? "1" : "0"); } catch {}
    if (next) toast({ title: "Saved!", description: "Added to your favourites." });
  };
  const ogUrl = `https://store.advize.in/product/${product.id}`;
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: `Check out ${product.name}`, url: ogUrl });
      } else {
        await navigator.clipboard.writeText(ogUrl);
        toast({ title: "Link copied!", description: "Product link copied to clipboard." });
      }
    } catch {}
  };

  useEffect(() => {
    setLocalReviews(reviews);
    if (reviews.length > 0) setReviewsFetched(true);
  }, [reviews]);

  const handleToggleReviews = async () => {
    const opening = !reviewsOpen;
    setReviewsOpen(opening);
    if (opening && !reviewsFetched) {
      setReviewsFetching(true);
      try {
        const fetched = await getReviews(product.id);
        setLocalReviews(fetched);
        setReviewsFetched(true);
      } catch { /* ignore */ } finally {
        setReviewsFetching(false);
      }
    }
  };

  const avgRating = localReviews.length
    ? localReviews.reduce((s, r) => s + r.rating, 0) / localReviews.length : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star, count: localReviews.filter(r => r.rating === star).length,
  }));
  const handleSelectVariant = (label: string, value: string) =>
    setSelectedVariants(prev => ({ ...prev, [label]: prev[label] === value ? "" : value }));

  const effectivePrice = (product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price)
    ? product.salePrice : product.price;

  const handleAddToCart = () => {
    addItem(product, storeId, storeSlug);
    setAddedToCart(true);
    toast({ title: "Added to cart!", description: `${product.name} added. Tap the cart to review your order.` });
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleOrder = () => {
    const variantSummary = product.variants?.filter(v => selectedVariants[v.label])
      .map(v => `${v.label}: ${selectedVariants[v.label]}`).join(", ");
    const variantText = variantSummary ? `\n🎨 Variant: ${variantSummary}` : "";
    const message = `Hello 👋,\n\nI want to order this product:\n\n🛍 Product: ${product.name}${variantText}\n💰 Price: ₹${effectivePrice.toLocaleString("en-IN")}\n\n🔗 Product Link: ${ogUrl}\n\nPlease confirm availability.`;
    const number = storeWhatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
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

  /* ── Shared JSX helpers (used in both mobile and desktop layouts) ── */
  const hasSale = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
  const displayPrice = hasSale ? product.salePrice! : product.price;
  const savings = hasSale ? product.price - product.salePrice! : 0;
  const discountPct = hasSale ? Math.round((product.price - product.salePrice!) / product.price * 100) : 0;

  const priceJsx = product.productType === "mix_match" ? (
    (() => {
      const sorted = [...(product.pricingTiers ?? [])].sort((a, b) => a.quantity - b.quantity);
      const min = sorted[0];
      if (!min) return null;
      return (
        <div>
          <p className="text-xs text-muted-foreground">Starting from</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-primary">&#8377;{min.price.toLocaleString("en-IN")}</span>
            <span className="text-sm text-muted-foreground">/ {min.quantity} pc{min.quantity !== 1 ? "s" : ""}</span>
          </div>
        </div>
      );
    })()
  ) : (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-extrabold text-foreground">
          &#8377;{displayPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </span>
        {hasSale ? (
          <>
            <span className="text-sm text-muted-foreground line-through">
              MRP &#8377;{product.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
            <span className="text-sm font-bold text-green-500">({discountPct}% OFF)</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">MRP &#8377;{product.price.toLocaleString("en-IN")}</span>
        )}
      </div>
      {hasSale && (
        <p className="text-xs text-green-500 font-semibold mt-0.5">
          Rs. {savings.toLocaleString("en-IN", { maximumFractionDigits: 0 })} OFF on this order
        </p>
      )}
    </div>
  );

  const variantsJsx = product.productType !== "mix_match" && product.variants && product.variants.length > 0
    ? product.variants.map(variant => (
        <div key={variant.label}>
          <p className="text-sm font-semibold text-foreground mb-2">
            {variant.label}
            {selectedVariants[variant.label] && (
              <span className="font-normal text-muted-foreground">: {selectedVariants[variant.label]}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2" data-testid="variants-section">
            {variant.values.map(value => {
              const isSelected = selectedVariants[variant.label] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSelectVariant(variant.label, value)}
                  className={`min-w-[52px] h-11 px-3 rounded-xl border text-sm font-semibold transition-all ${
                    isSelected
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-foreground border-border hover:border-foreground/50"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))
    : null;

  const ctaJsx = product?.productType === "affiliate" ? (
    <div className="flex gap-3">
      <Button
        className="w-full h-12 text-sm rounded-xl font-bold gap-2 bg-green-600 hover:bg-green-700 text-white border-transparent"
        onClick={() => product.affiliateUrl && window.open(product.affiliateUrl, "_blank")}
        data-testid="btn-buy-now-affiliate"
      >
        <ExternalLink className="h-4 w-4" />
        Buy Now
      </Button>
    </div>
  ) : (
    <div className="flex gap-3">
      <Button
        className="flex-1 h-12 text-sm rounded-xl font-bold gap-2 bg-green-600 hover:bg-green-700 text-white border-transparent"
        onClick={handleOrder}
      >
        <MessageCircle className="h-4 w-4" />
        {hasPayment ? "Buy Now" : "Order on WhatsApp"}
      </Button>
      {hasPayment && (
        <Button
          className="flex-1 h-12 text-sm rounded-xl font-bold gap-2 bg-orange-500 hover:bg-orange-600 text-white border-transparent"
          onClick={handleAddToCart}
          disabled={product.units === 0}
          data-testid="btn-add-to-cart"
        >
          <ShoppingBag className={`h-4 w-4 ${addedToCart ? "fill-white" : ""}`} />
          {addedToCart ? "Added!" : "Add to Cart"}
        </Button>
      )}
    </div>
  );

  const viewCartJsx = hasPayment && storeSlug && totalItems > 0 ? (
    <Link
      href={cartPath}
      className="flex items-center justify-between gap-3 bg-primary/10 hover:bg-primary/15 border border-primary/30 rounded-2xl px-4 py-2.5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-primary">View Cart</span>
        <span className="bg-primary text-primary-foreground text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
          {totalItems}
        </span>
      </div>
      <ArrowLeft className="h-3.5 w-3.5 text-primary rotate-180 shrink-0" />
    </Link>
  ) : null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">

      {/* ════════════════════════════════════════════════════════
          DESKTOP: Sticky header bar
      ════════════════════════════════════════════════════════ */}
      <header className="hidden md:flex border-b bg-card/95 backdrop-blur-sm sticky top-0 z-20 items-center px-6 h-14">
        <button
          onClick={() => window.history.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-semibold text-base truncate max-w-xs px-4">{product.name}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleLike}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart className={`h-4.5 w-4.5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
            aria-label="Share"
          >
            <Share2 className="h-4.5 w-4.5" />
          </button>
          {storeSlug && hasPayment && (
            <Link href={cartPath} className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors">
              <ShoppingCart className="h-4.5 w-4.5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center leading-none shadow">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </Link>
          )}
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════
          DESKTOP: Stasher-style 3-column layout
      ════════════════════════════════════════════════════════ */}
      <div className="hidden md:block bg-background flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex gap-6 items-start">

            {/* Left: vertical thumbnail strip */}
            {images.length > 1 && (
              <div className="w-[88px] shrink-0 flex flex-col gap-2 sticky top-[4.5rem]">
                {images.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      idx === activeImageIdx ? "border-primary shadow-sm" : "border-transparent opacity-60 hover:opacity-90"
                    }`}
                  >
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Center: large main image */}
            <div className={`min-w-0 sticky top-[4.5rem] ${images.length > 1 ? "flex-1" : "w-[55%]"}`}>
              <ZoomableImage
                src={images[activeImageIdx] ?? product.imageUrl}
                alt={product.name}
              />
            </div>

            {/* Right: product info panel */}
            <div className="w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-5">

              {/* Rating */}
              {localReviews.length > 0 && (
                <button
                  onClick={handleToggleReviews}
                  className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                >
                  <StarRating value={Math.round(avgRating)} size="sm" />
                  <span className="text-sm text-muted-foreground underline underline-offset-2">
                    {localReviews.length} Review{localReviews.length !== 1 ? "s" : ""}
                  </span>
                </button>
              )}

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-foreground leading-tight">{product.name}</h1>
                {product.category && (
                  <p className="text-xs text-muted-foreground mt-1">{product.category}</p>
                )}
              </div>

              {/* Price */}
              {priceJsx}

              {/* Description */}
              {product.description && (
                <DescriptionRenderer text={product.description} className="text-sm text-muted-foreground" />
              )}

              {/* Variants */}
              {product.productType === "mix_match" ? (
                <MixMatchBuyerView
                  product={product}
                  storeWhatsapp={storeWhatsapp}
                  storeSlug={storeSlug}
                  storeId={storeId}
                  hasPayment={hasPayment}
                />
              ) : (
                <div className="flex flex-col gap-5">
                  {variantsJsx}

                  {product.units === 0 && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>This item is currently out of stock. You can still message the seller.</span>
                    </div>
                  )}

                  {ctaJsx}
                  {viewCartJsx}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MOBILE: Full-width portrait image with overlaid controls
      ════════════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col flex-1">

        {/* Full-width portrait image */}
      <div className="relative w-full overflow-hidden bg-muted/20" style={{ aspectRatio: "3/4" }}>
        {/* Floating header: back · share · cart */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 pt-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="flex items-center justify-center w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm" aria-label="Share">
              <Share2 className="h-4 w-4 text-white" />
            </button>
            {storeSlug && hasPayment && (
              <Link href={cartPath} className="relative flex items-center justify-center w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm">
                <ShoppingCart className="h-4 w-4 text-white" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center leading-none shadow">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Main image — fills portrait container */}
        <ZoomableImage
          src={images[activeImageIdx] ?? product.imageUrl}
          alt={product.name}
          imgClassName="w-full h-full object-cover object-top"
        />

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIdx(idx)}
                className={`rounded-full transition-all pointer-events-auto ${idx === activeImageIdx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        )}

        {/* Rating badge — bottom-left */}
        {localReviews.length > 0 && (
          <div className="absolute bottom-4 left-3 z-10 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-white text-xs font-bold">{avgRating.toFixed(1)}</span>
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-white/70 text-xs">· {localReviews.length}</span>
          </div>
        )}

        {/* Like button — bottom-right */}
        <button
          onClick={handleLike}
          className="absolute bottom-4 right-3 z-10 w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
      </div>

      {/* Thumbnail strip — multiple images */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide bg-background">
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImageIdx(idx)}
              className={`w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                idx === activeImageIdx ? "border-primary" : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ── Content area ── */}
      <div className="flex-1 bg-background">

        {/* Title + price + rating */}
        <div className="px-4 pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-bold text-foreground leading-snug flex-1">{product.name}</h1>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              <button onClick={handleShare} className="w-8 h-8 rounded-full border border-border flex items-center justify-center" aria-label="Share">
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button onClick={handleLike} className="w-8 h-8 rounded-full border border-border flex items-center justify-center" aria-label={liked ? "Unlike" : "Like"}>
                <Heart className={`h-3.5 w-3.5 ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
              </button>
            </div>
          </div>

          {product.category && (
            <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
          )}

          {/* Price */}
          {product.productType === "mix_match" ? (
            (() => {
              const sorted = [...(product.pricingTiers ?? [])].sort((a, b) => a.quantity - b.quantity);
              const min = sorted[0];
              if (!min) return null;
              return (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Starting from</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-primary">&#8377;{min.price.toLocaleString("en-IN")}</span>
                    <span className="text-sm text-muted-foreground">/ {min.quantity} pc{min.quantity !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
              const hasSale = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
              const displayPrice = hasSale ? product.salePrice! : product.price;
              const savings = hasSale ? product.price - product.salePrice! : 0;
              const discountPct = hasSale ? Math.round((product.price - product.salePrice!) / product.price * 100) : 0;
              return (
                <div className="mt-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-extrabold text-foreground">
                      &#8377;{displayPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    {hasSale ? (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          MRP &#8377;{product.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-sm font-bold text-green-500">({discountPct}% OFF)</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        MRP &#8377;{product.price.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {hasSale && (
                    <p className="text-xs text-green-500 font-semibold mt-0.5">
                      Rs. {savings.toLocaleString("en-IN", { maximumFractionDigits: 0 })} OFF on this order
                    </p>
                  )}
                </div>
              );
            })()
          )}

          {/* Rating inline */}
          {localReviews.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <StarRating value={Math.round(avgRating)} size="sm" />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} &middot; {localReviews.length} review{localReviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {product.description ? (
          <div className="border-t px-4 py-4">
            <DescriptionRenderer text={product.description} className="text-sm" />
          </div>
        ) : null}

        {/* Mix & Match OR normal variants + CTA */}
        {product.productType === "mix_match" ? (
          <div className="border-t">
            <MixMatchBuyerView
              product={product}
              storeWhatsapp={storeWhatsapp}
              storeSlug={storeSlug}
              storeId={storeId}
              hasPayment={hasPayment}
            />
          </div>
        ) : (
          <>
            {/* Variant pickers */}
            {product.variants && product.variants.length > 0 && product.variants.map(variant => (
              <div key={variant.label} className="border-t px-4 py-4">
                <p className="text-sm font-semibold text-foreground mb-3">
                  {variant.label}
                  {selectedVariants[variant.label] && (
                    <span className="font-normal text-muted-foreground">: {selectedVariants[variant.label]}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2" data-testid="variants-section">
                  {variant.values.map(value => {
                    const isSelected = selectedVariants[variant.label] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleSelectVariant(variant.label, value)}
                        className={`min-w-[52px] h-11 px-3 rounded-xl border text-sm font-semibold transition-all ${
                          isSelected
                            ? "bg-foreground text-background border-foreground"
                            : "bg-background text-foreground border-border hover:border-foreground/50"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Out of stock */}
            {product.units === 0 && (
              <div className="border-t px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>This item is currently out of stock. You can still message the seller.</span>
                </div>
              </div>
            )}

            {/* CTA — Buy Now (WhatsApp) · Add to Cart */}
            {product?.productType === "affiliate" ? (
              <div className="border-t px-4 py-4">
                <Button
                  className="w-full h-12 text-sm rounded-xl font-bold gap-2 bg-green-600 hover:bg-green-700 text-white border-transparent"
                  onClick={() => product.affiliateUrl && window.open(product.affiliateUrl, "_blank")}
                  data-testid="btn-buy-now-affiliate"
                >
                  <ExternalLink className="h-4 w-4" />
                  Buy Now
                </Button>
              </div>
            ) : (
              <div className="border-t px-4 py-4 flex gap-3">
                <Button
                  className="flex-1 h-12 text-sm rounded-xl font-bold gap-2 bg-green-600 hover:bg-green-700 text-white border-transparent"
                  onClick={handleOrder}
                >
                  <MessageCircle className="h-4 w-4" />
                  {hasPayment ? "Buy Now" : "Order on WhatsApp"}
                </Button>
                {hasPayment && (
                  <Button
                    className="flex-1 h-12 text-sm rounded-xl font-bold gap-2 bg-orange-500 hover:bg-orange-600 text-white border-transparent"
                    onClick={handleAddToCart}
                    disabled={product.units === 0}
                    data-testid="btn-add-to-cart"
                  >
                    <ShoppingBag className={`h-4 w-4 ${addedToCart ? "fill-white" : ""}`} />
                    {addedToCart ? "Added!" : "Add to Cart"}
                  </Button>
                )}
              </div>
            )}

            {/* View cart pill */}
            {hasPayment && storeSlug && totalItems > 0 && (
              <div className="px-4 pb-2">
                <Link
                  href={cartPath}
                  className="flex items-center justify-between gap-3 bg-primary/10 hover:bg-primary/15 border border-primary/30 rounded-2xl px-4 py-2.5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-primary">View Cart</span>
                    <span className="bg-primary text-primary-foreground text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
                      {totalItems}
                    </span>
                  </div>
                  <ArrowLeft className="h-3.5 w-3.5 text-primary rotate-180 shrink-0" />
                </Link>
              </div>
            )}
          </>
        )}

        <div className="pb-6" />
      </div>{/* /flex-1 content */}
    </div>{/* /md:hidden mobile wrapper */}

      {/* ════════════════════════════════════════════════════════
          SHARED: Related products + Reviews
          (visible on both mobile and desktop, below each layout)
      ════════════════════════════════════════════════════════ */}
      <div className="md:max-w-6xl md:mx-auto md:px-6 w-full">
        <RelatedProducts products={relatedProducts} />
      </div>

      {/* Reviews collapsible */}
      <div className="border-t md:max-w-6xl md:mx-auto md:w-full">
        <button
          onClick={handleToggleReviews}
          className="w-full flex items-center justify-between px-4 md:px-6 py-4 text-left"
        >
          <div className="flex items-center gap-2.5">
            <Star className={`h-5 w-5 shrink-0 ${reviewsFetched && localReviews.length > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            <span className="text-base font-bold">Customer Reviews</span>
            {reviewsFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />}
            {reviewsFetched && localReviews.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                · {avgRating.toFixed(1)}★ ({localReviews.length})
              </span>
            )}
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${reviewsOpen ? "rotate-180" : ""}`} />
        </button>

        {reviewsOpen && (
          <div className="px-4 md:px-6 pb-8 border-t">
            {reviewsFetching ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="pt-6">
                <ReviewsList
                  reviews={localReviews}
                  avgRating={avgRating}
                  ratingCounts={ratingCounts}
                  showForm={showForm}
                  setShowForm={setShowForm}
                  reviewName={reviewName}
                  setReviewName={setReviewName}
                  reviewRating={reviewRating}
                  setReviewRating={setReviewRating}
                  reviewComment={reviewComment}
                  setReviewComment={setReviewComment}
                  submitting={submitting}
                  handleSubmitReview={handleSubmitReview}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pb-10" />
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
  const [storeId, setStoreId] = useState("");
  const [storefrontTheme, setStorefrontTheme] = useState<string | undefined>(undefined);
  const [storeHasPayment, setStoreHasPayment] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    /** Apply a fully-loaded product-detail payload to component state. */
    function applyPayload(payload: {
      product: Product;
      store: import("@/lib/api").Store | null;
      reviews?: Review[];
      relatedProducts: Product[];
    }) {
      setProduct(payload.product);
      if (payload.reviews !== undefined) setReviews(payload.reviews);
      if (!isOwnerView && payload.store) {
        setStoreWhatsapp(payload.store.whatsapp ?? "");
        setStoreSlug(payload.store.slug ?? "");
        setStoreId(payload.store.id ?? "");
        setStorefrontTheme(payload.store.storefront_theme);
        setStoreHasPayment(!!(
          payload.store.razorpay_account_id ||
          payload.store.razorpay_key_id ||
          payload.store.advize_payment_enabled
        ));
        setRelatedProducts(payload.relatedProducts);
      }
    }

    async function load() {
      // ── Buyer view: check module-level cache first ──────────────────────
      if (!isOwnerView) {
        const hit = pdCache.get(id!);
        if (hit && Date.now() - hit.ts < PD_CACHE_TTL) {
          // Serve immediately from cache (zero network calls)
          applyPayload(hit);
          setLoading(false);
          // Revalidate silently in the background
          getProductDetail(id!).then(fresh => {
            if (cancelled) return;
            pdCache.set(id!, { ...fresh, ts: Date.now() });
            applyPayload(fresh);
          }).catch(() => {/* ignore background errors */});
          return;
        }

        // Cache miss — single round-trip combined endpoint
        setLoading(true);
        try {
          const fresh = await getProductDetail(id!);
          if (cancelled) return;
          pdCache.set(id!, { ...fresh, ts: Date.now() });
          applyPayload(fresh);
        } catch {
          // product not found — leave null
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      // ── Owner view: product + reviews + analytics in parallel ───────────
      setLoading(true);
      try {
        const [loadedProduct, reviews, analytics] = await Promise.all([
          getProduct(id!),
          getReviews(id!),
          getProductAnalytics(id!),
        ]);
        if (cancelled) return;
        setProduct(loadedProduct);
        setReviews(reviews ?? []);
        if (analytics) setProductAnalytics(analytics);
      } catch {
        // product not found — leave null
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, isOwnerView]);

  // ── Deferred: load "You may also like" AFTER main content renders ────────
  // This fires only for buyer view, only once the product is loaded, and
  // never blocks the initial paint. On a warm server cache it completes in
  // < 5 ms; on a cold start the catalog fetch happens off the critical path.
  useEffect(() => {
    if (isOwnerView || !id || !product) return;
    let cancelled = false;
    getRelatedProducts(id).then(related => {
      if (!cancelled && related.length > 0) setRelatedProducts(related);
    });
    return () => { cancelled = true; };
  }, [id, product?.id, isOwnerView]);

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
    <BuyerView product={product} reviews={reviews} storeWhatsapp={storeWhatsapp} storeSlug={storeSlug} storeId={storeId} relatedProducts={relatedProducts} hasPayment={storeHasPayment} storefrontTheme={storefrontTheme} />
  );
}
