import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  Package, TrendingUp, ShoppingBag, Plus, Boxes,
  Store, LayoutDashboard, ListOrdered, Star, Loader2,
  QrCode, Download,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { useStore } from "@/hooks/use-store";
import { getProducts, getAnalytics, type AnalyticsSummary } from "@/lib/api";
import type { Store as StoreType } from "@/lib/api";
import type { Product } from "@/lib/mock-data";

/* ── helpers ────────────────────────────────────────── */
function MiniStat({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex-1 bg-card border rounded-2xl px-3 py-3 flex flex-col gap-1 min-w-0">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${color}`}>{icon}</div>
      <p className="text-[11px] text-muted-foreground font-medium leading-tight mt-1">{label}</p>
      <p className="text-base font-bold text-foreground leading-tight truncate">{value}</p>
    </div>
  );
}

/* ── QR Code card (shared) ───────────────────────────── */
function QrCodeCard({ storeUrl, storeName, compact = false }: {
  storeUrl: string;
  storeName: string;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = `${storeName.toLowerCase().replace(/\s+/g, "-")}-qr-code.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const qrSize = compact ? 96 : 180;

  return (
    <div className={`bg-card border rounded-2xl p-4 ${compact ? "" : "sm:p-5"}`} data-testid="qr-code-card">
      <div className="flex items-center gap-2 mb-1">
        <QrCode className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm font-semibold">Store QR Code</p>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        {compact
          ? "Let customers scan to visit your store."
          : "Share this with customers — they scan it and land straight on your store."}
      </p>

      {compact ? (
        /* Compact layout: QR on left, actions on right */
        <div className="flex items-center gap-4">
          <div ref={containerRef} className="p-2 bg-white rounded-xl border shadow-sm shrink-0">
            <QRCodeCanvas
              value={storeUrl}
              size={qrSize}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
              level="M"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground break-all mb-3 leading-relaxed">{storeUrl}</p>
            <Button onClick={handleDownload} size="sm" className="w-full rounded-full text-xs" data-testid="btn-download-qr">
              <Download className="h-3 w-3 mr-1.5" />
              Download PNG
            </Button>
          </div>
        </div>
      ) : (
        /* Full layout: centred */
        <div className="flex flex-col items-center gap-3">
          <div ref={containerRef} className="p-4 bg-white rounded-2xl border shadow-sm">
            <QRCodeCanvas
              value={storeUrl}
              size={qrSize}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
              level="M"
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center break-all max-w-[240px] leading-relaxed">
            {storeUrl}
          </p>
          <Button onClick={handleDownload} className="w-full rounded-full" size="sm" data-testid="btn-download-qr-full">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download QR Code
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── panels ─────────────────────────────────────────── */
function HomePanel({ products, analytics, store }: {
  products: Product[];
  analytics: AnalyticsSummary | null;
  store: StoreType | null;
}) {
  const inStockCount = products.filter(p => p.units > 0).length;
  const outCount = products.filter(p => p.units === 0).length;
  const totalUnits = products.reduce((s, p) => s + p.units, 0);
  const avgStoreRating = analytics?.avgRating ?? "–";
  const storeUrl = store?.slug
    ? `${window.location.origin}/store/${store.slug}`
    : "";

  return (
    <div className="p-3 sm:p-6 space-y-4 pb-28">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Here's your store at a glance.</p>
        </div>
        <Button asChild size="sm" className="rounded-full shadow-sm text-xs" data-testid="btn-add-product">
          <Link href="/add-product"><Plus className="h-3.5 w-3.5 mr-1" />Add Product</Link>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <MiniStat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Clicks"
          value={(analytics?.totalClicks ?? 0).toLocaleString()} color="bg-violet-100 text-violet-600" />
        <MiniStat icon={<ShoppingBag className="h-3.5 w-3.5" />} label="Reviews"
          value={analytics?.totalReviews ?? 0} color="bg-sky-100 text-sky-600" />
        <MiniStat icon={<Package className="h-3.5 w-3.5" />} label="Products"
          value={products.length} color="bg-amber-100 text-amber-600" />
        <MiniStat icon={<Boxes className="h-3.5 w-3.5" />} label="Units"
          value={totalUnits} color="bg-primary/10 text-primary" />
      </div>

      <div className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-4 overflow-x-auto no-scrollbar" data-testid="inventory-summary">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-0.5">In Stock</p>
            <p className="text-sm font-bold text-green-600" data-testid="stat-in-stock">{inStockCount} products</p>
          </div>
        </div>
        <div className="w-px h-8 bg-border shrink-0" />
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Out of Stock</p>
            <p className="text-sm font-bold text-red-500" data-testid="stat-out-of-stock">{outCount} products</p>
          </div>
        </div>
        <div className="w-px h-8 bg-border shrink-0" />
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="h-3 w-3 fill-amber-400" />
            <span className="text-sm font-bold text-foreground">
              {analytics?.avgRating ?? avgStoreRating}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">avg rating</span>
        </div>
      </div>

      {/* QR code compact card */}
      {storeUrl && (
        <QrCodeCard storeUrl={storeUrl} storeName={store?.name ?? "store"} compact />
      )}

      <AnalyticsSection liveData={analytics} />
    </div>
  );
}

function MyStorePanel({ store, products }: {
  store: StoreType | null;
  products: Product[];
}) {
  const storeUrl = store?.slug
    ? `${window.location.origin}/store/${store.slug}`
    : "";

  return (
    <div className="pb-28">
      <div className="bg-primary text-primary-foreground py-8 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-lg text-primary">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">{store?.name ?? "My Shop"}</h2>
          {store?.category && (
            <p className="text-primary-foreground/80 bg-black/10 px-3 py-0.5 rounded-full text-xs font-medium mt-1.5">
              {store.category}
            </p>
          )}
          {store?.location && (
            <p className="text-primary-foreground/70 text-xs mt-1">{store.location}</p>
          )}
        </div>
      </div>

      <div className="px-2.5 pt-4 space-y-4">
        {/* Full QR code card */}
        {storeUrl && (
          <QrCodeCard storeUrl={storeUrl} storeName={store?.name ?? "store"} />
        )}

        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <p className="text-sm font-bold">All Products</p>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {products.length} items
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {products.map(product => (
              <ProductCard key={product.id} product={product} showActions={false} productHref={`/product/${product.id}?from=dashboard`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingsPanel({ products, onRefresh }: {
  products: Product[];
  onRefresh: () => void;
}) {
  return (
    <div className="p-3 pb-28">
      <div className="flex items-center justify-between mb-4 pt-1">
        <div>
          <h2 className="text-lg font-bold">My Listings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{products.length} products listed</p>
        </div>
        <Button asChild size="sm" className="rounded-full shadow-sm text-xs" data-testid="btn-add-product-listings">
          <Link href="/add-product"><Plus className="h-3.5 w-3.5 mr-1" />Add New</Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No products yet</p>
          <p className="text-sm mt-1">Add your first product to get started!</p>
          <Button asChild className="mt-4 rounded-full" size="sm">
            <Link href="/add-product"><Plus className="h-3.5 w-3.5 mr-1" />Add Product</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {products.map(product => (
            <ProductCard key={product.id} product={product} showActions={true} onDelete={onRefresh} productHref={`/product/${product.id}?from=dashboard`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── main layout ─────────────────────────────────────── */
const TABS = [
  { label: "Home",       icon: LayoutDashboard },
  { label: "My Store",   icon: Store           },
  { label: "Listings",   icon: ListOrdered     },
] as const;

export function DashboardPage() {
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const { store, loading: storeLoading } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async (storeId: string) => {
    setDataLoading(true);
    try {
      const [prods, anal] = await Promise.all([
        getProducts(storeId),
        getAnalytics(storeId),
      ]);
      setProducts(prods);
      setAnalytics(anal);
    } catch {
      // silent — show empty state
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (store?.id) loadData(store.id);
  }, [store?.id, loadData]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) < 50) return;
    if (delta > 0) setActive(p => Math.min(p + 1, TABS.length - 1));
    else           setActive(p => Math.max(p - 1, 0));
    touchStartX.current = null;
  };

  const isLoading = storeLoading || dataLoading;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/10 overflow-hidden">

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-xl">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-bold text-foreground">Shop</span>
          </Link>

          <div className="hidden sm:flex items-center gap-1 bg-muted rounded-full p-1">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActive(i)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  active === i
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-muted-foreground font-medium hidden sm:block">
            {store?.name ?? "My Shop"}
          </div>
        </div>

        <div className="flex sm:hidden justify-center gap-1.5 pb-2">
          {TABS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`rounded-full transition-all duration-300 ${
                active === i ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : (
        <div
          className="flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex h-full transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            <div className="w-full flex-shrink-0 h-full overflow-y-auto">
              <HomePanel products={products} analytics={analytics} store={store} />
            </div>

            <div className="w-full flex-shrink-0 h-full overflow-y-auto">
              <MyStorePanel store={store} products={products} />
            </div>

            <div className="w-full flex-shrink-0 h-full overflow-y-auto">
              <ListingsPanel
                products={products}
                onRefresh={() => store?.id && loadData(store.id)}
              />
            </div>
          </div>
        </div>
      )}

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t">
        <div className="flex">
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = active === i;
            return (
              <button
                key={tab.label}
                onClick={() => setActive(i)}
                className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={`tab-${tab.label.toLowerCase().replace(" ", "-")}`}
              >
                <Icon className={`h-5 w-5 transition-transform ${isActive ? "scale-110" : "scale-100"}`} />
                <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {tab.label}
                </span>
                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
