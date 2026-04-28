import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  Package, TrendingUp, ShoppingBag, Plus, Boxes,
  Store, LayoutDashboard, ListOrdered, Star, Loader2,
  QrCode, Moon, Sun, Share2, Copy, Check, LogOut, Flame, Camera,
  Pencil, Phone, MapPin, Tag,
  Puzzle, CreditCard, Globe, Truck, Lock, Sparkles,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ProductCard } from "@/components/ProductCard";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { useStore } from "@/hooks/use-store";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { getProducts, getAnalytics, updateProduct, updateStore, uploadImage, type AnalyticsSummary } from "@/lib/api";
import type { Store as StoreType } from "@/lib/api";
import type { Product } from "@/lib/api";

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
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  /* Extract the rendered QR canvas as a PNG File */
  const getQrFile = (): File | null => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return null;
    // Render onto a larger canvas with padding so it looks clean when shared
    const pad = 24;
    const out = document.createElement("canvas");
    out.width = canvas.width + pad * 2;
    out.height = canvas.height + pad * 2;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, pad, pad);
    const dataUrl = out.toDataURL("image/png");
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    const bytes = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) bytes[i] = bstr.charCodeAt(i);
    return new File([bytes], `${storeName.toLowerCase().replace(/\s+/g, "-")}-qr.png`, { type: mime });
  };

  const handleShare = async () => {
    const file = getQrFile();
    const shareData = {
      title: `${storeName} — Shop Online`,
      text: `Scan this QR code or tap the link to visit ${storeName}'s store! 🛍️\n${storeUrl}`,
      url: storeUrl,
      ...(file ? { files: [file] } : {}),
    };

    if (navigator.share) {
      try {
        /* Try sharing with QR image file first */
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: shareData.title, text: shareData.text, files: [file] });
        } else {
          await navigator.share({ title: shareData.title, text: shareData.text, url: storeUrl });
        }
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return; // user cancelled — don't fall through
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share it with your customers." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Couldn't copy link", description: storeUrl });
    }
  };

  const qrSize = compact ? 96 : 200;

  return (
    <div className={`bg-card border rounded-2xl p-4 ${compact ? "" : "sm:p-5"}`} data-testid="qr-code-card">
      <div className="flex items-center gap-2 mb-1">
        <QrCode className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm font-semibold">Store QR Code</p>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        {compact
          ? "Share the QR code — customers scan it to visit your store."
          : "Share this with customers — they scan it and land straight on your store."}
      </p>

      {compact ? (
        /* Compact layout: QR on left, actions on right */
        <div className="flex items-center gap-4">
          <div ref={qrRef} className="p-2 bg-white rounded-xl border shadow-sm shrink-0">
            <QRCodeCanvas
              value={storeUrl}
              size={qrSize}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
              level="M"
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <p className="text-[10px] text-muted-foreground break-all leading-relaxed">{storeUrl}</p>
            <Button onClick={handleShare} size="sm" className="w-full rounded-full text-xs" data-testid="btn-share-link-qr">
              {copied ? <Check className="h-3 w-3 mr-1.5" /> : <Share2 className="h-3 w-3 mr-1.5" />}
              {copied ? "Copied!" : "Share QR Code"}
            </Button>
          </div>
        </div>
      ) : (
        /* Full layout: centred */
        <div className="flex flex-col items-center gap-3">
          <div ref={qrRef} className="p-4 bg-white rounded-2xl border shadow-sm">
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
          <Button onClick={handleShare} className="w-full rounded-full" size="sm" data-testid="btn-share-link-qr-full">
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Share2 className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? "Copied!" : "Share QR Code"}
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

function MyStorePanel({ store, products, onLogoChange, onStoreChange }: {
  store: StoreType | null;
  products: Product[];
  onLogoChange: (url: string) => void;
  onStoreChange: (updated: StoreType) => void;
}) {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  /* ── edit store state ── */
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editRazorpayKeyId, setEditRazorpayKeyId] = useState("");
  const [editRazorpaySecret, setEditRazorpaySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    setEditName(store?.name ?? "");
    setEditPhone(store?.whatsapp ?? "");
    setEditLocation(store?.location ?? "");
    setEditCategory(store?.category ?? "");
    setEditRazorpayKeyId(store?.razorpay_key_id ?? "");
    setEditRazorpaySecret("");
    setShowSecret(false);
    setEditing(true);
  };

  const handleSaveStore = async () => {
    if (!store?.id) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: editName.trim() || store.name,
        whatsapp: editPhone.trim(),
        location: editLocation.trim(),
        category: editCategory.trim(),
      };
      if (editRazorpayKeyId.trim()) payload.razorpay_key_id = editRazorpayKeyId.trim();
      if (editRazorpaySecret.trim()) payload.razorpay_key_secret = editRazorpaySecret.trim();
      const hasRazorpay = !!(editRazorpayKeyId.trim() || store.razorpay_key_id);
      payload.razorpay_enabled = hasRazorpay;
      const updated = await updateStore(store.id, payload);
      onStoreChange(updated);
      setEditing(false);
      toast({ title: "Store updated!", description: "Your store details have been saved." });
    } catch {
      toast({ variant: "destructive", title: "Failed to update store", description: "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const storeUrl = store?.slug
    ? `${window.location.origin}/store/${store.slug}`
    : "";

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    setLogoUploading(true);
    try {
      const url = await uploadImage(file);
      await updateStore(store.id, { logo_url: url });
      onLogoChange(url);
      toast({ title: "Logo updated!", description: "Your store logo has been saved." });
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "Please try again." });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  return (
    <div className="pb-28">
      <div className="bg-primary text-primary-foreground py-8 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />

        {/* Edit button */}
        <button
          onClick={openEdit}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          title="Edit store details"
        >
          <Pencil className="w-3.5 h-3.5 text-white" />
        </button>

        <div className="flex flex-col items-center text-center relative z-10">

          {/* Tappable logo */}
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
            className="relative w-20 h-20 mb-3 group"
            title="Change store logo"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-lg border-2 border-white/40 flex items-center justify-center text-primary">
              {store?.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-9 h-9" />
              )}
            </div>
            {/* Overlay hint */}
            <div className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition-opacity ${
              logoUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}>
              {logoUploading
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <Camera className="w-5 h-5 text-white" />
              }
            </div>
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
          <p className="text-primary-foreground/60 text-[10px] mb-2">Tap logo to change</p>

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

      {/* ── Inline edit store form ── */}
      {editing && (
        <div className="mx-2.5 mt-4 bg-card border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold">Edit Store Details</p>
            <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground text-xs underline">Cancel</button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Store className="h-3.5 w-3.5" /> Store Name</label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. My Boutique" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> WhatsApp Number</label>
            <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="e.g. 919876543210" className="h-11 rounded-xl" type="tel" />
            <p className="text-[11px] text-muted-foreground">Include country code, no + or spaces (e.g. 919876543210)</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Category</label>
            <Input value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="e.g. Clothes, Food, Crafts" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location</label>
            <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="e.g. Mumbai, Maharashtra" className="h-11 rounded-xl" />
          </div>

          {/* ── Razorpay section ── */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-semibold">Payment Gateway</p>
              {store?.razorpay_key_id && (
                <span className="ml-auto text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Enter your Razorpay keys to enable online payments on your product pages.{" "}
              <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                Get keys from Razorpay →
              </a>
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Key ID</label>
                <Input
                  value={editRazorpayKeyId}
                  onChange={e => setEditRazorpayKeyId(e.target.value)}
                  placeholder="rzp_live_xxxxxxxxxxxx"
                  className="h-11 rounded-xl font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Key Secret {store?.razorpay_key_id ? "(leave blank to keep existing)" : ""}
                </label>
                <div className="relative">
                  <Input
                    value={editRazorpaySecret}
                    onChange={e => setEditRazorpaySecret(e.target.value)}
                    type={showSecret ? "text" : "password"}
                    placeholder={store?.razorpay_key_id ? "••••••••••••••••" : "Enter your secret key"}
                    className="h-11 rounded-xl pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <Lock className="h-4 w-4" /> : <Lock className="h-4 w-4 opacity-40" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Your secret key is stored securely and never shown to customers.</p>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveStore} disabled={saving} className="w-full h-11 rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

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
              <ProductCard key={product.id} product={product} showActions={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingsPanel({ products, onRefresh, onProductsChange, onDeleteProduct }: {
  products: Product[];
  onRefresh: () => void;
  onProductsChange: (updated: Product) => void;
  onDeleteProduct: (id: string) => void;
}) {
  const { toast } = useToast();

  const handleToggleTrending = async (product: Product) => {
    const newVal = !product.trending;
    try {
      await updateProduct(product.id, { trending: newVal } as any);
      onProductsChange({ ...product, trending: newVal });
      toast({
        title: newVal ? "Added to Trending 🔥" : "Removed from Trending",
        description: newVal
          ? `"${product.name}" will appear in the Trending section.`
          : `"${product.name}" removed from Trending.`,
      });
    } catch {
      toast({ variant: "destructive", title: "Failed to update", description: "Please try again." });
    }
  };

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
        <>
          <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
            Tap <span className="inline-flex items-center gap-0.5 text-orange-500 font-semibold"><Flame className="h-3 w-3" /> flame</span> to pin a product to the Trending section on your store.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                showActions={true}
                onDelete={() => onDeleteProduct(product.id)}
                onToggleTrending={() => handleToggleTrending(product)}
                productHref={`/product/${product.id}?from=dashboard`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Plugins Panel ───────────────────────────────────── */
function PluginsPanel({ store, onGoToMyStore }: { store: StoreType | null; onGoToMyStore: () => void }) {
  const paymentActive = !!(store?.razorpay_key_id);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="bg-primary/10 p-1.5 rounded-xl">
            <Puzzle className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Plugins</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-10">
          Extend your store with powerful add-ons.
        </p>
      </div>

      {/* Plugin cards */}
      <div className="flex flex-col gap-4">

        {/* ── Payment Integration (Razorpay) ── */}
        <div className={`bg-card border rounded-2xl p-5 shadow-sm ${paymentActive ? "border-green-400/60 dark:border-green-600/40" : ""}`}>
          <div className="flex gap-4 items-start">
            <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl flex-shrink-0">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-base font-semibold text-foreground leading-tight">Payment Integration</h3>
                {paymentActive ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Available
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {paymentActive
                  ? "Razorpay is connected. Customers can pay via UPI, cards, and wallets directly on product pages."
                  : "Accept online payments via Razorpay — UPI, credit/debit cards, wallets, and more."}
              </p>
              {paymentActive ? (
                <button
                  onClick={onGoToMyStore}
                  className="text-xs font-semibold text-primary underline underline-offset-2"
                >
                  Manage keys in My Store →
                </button>
              ) : (
                <button
                  onClick={onGoToMyStore}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Set Up Razorpay
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Custom Domain ── */}
        <div className="bg-card border rounded-2xl p-5 flex gap-4 items-start shadow-sm opacity-75">
          <div className="bg-violet-50 dark:bg-violet-950/40 p-3 rounded-xl flex-shrink-0">
            <Globe className="h-6 w-6 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold text-foreground leading-tight">Custom Domain</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use your own branded domain like mystore.com instead of the default Advize link.
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>

        {/* ── Dropshipping ── */}
        <div className="bg-card border rounded-2xl p-5 flex gap-4 items-start shadow-sm opacity-75">
          <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl flex-shrink-0">
            <Truck className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold text-foreground leading-tight">Import Dropshipping Products</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Source and import products from suppliers — sell without holding any inventory.
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>

      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        Have a plugin idea?{" "}
        <a
          href="https://wa.me/?text=Hi%2C+I+have+a+plugin+idea+for+Advize+Store%3A+"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium underline underline-offset-2"
        >
          Tell us on WhatsApp
        </a>
      </p>
    </div>
  );
}

/* ── main layout ─────────────────────────────────────── */
const TABS = [
  { label: "Home",       icon: LayoutDashboard },
  { label: "My Store",   icon: Store           },
  { label: "Listings",   icon: ListOrdered     },
  { label: "Plugins",    icon: Puzzle          },
] as const;

export function DashboardPage() {
  const search = useSearch();
  const initialTab = Math.min(parseInt(new URLSearchParams(search).get("tab") ?? "0") || 0, TABS.length - 1);
  const [active, setActive] = useState(initialTab);
  const prevActive = useRef(initialTab);
  const touchStartX = useRef<number | null>(null);
  const panelScrollTops = useRef<number[]>([0, 0, 0, 0]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const { dark, toggle: toggleDark } = useTheme();
  const { store, loading: storeLoading, setStore } = useStore();
  const { signOut } = useAuth();
  const [, setLocation] = useLocation();

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };
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

  // Save old tab scroll → restore new tab scroll
  useEffect(() => {
    const prev = prevActive.current;
    if (prev !== active) {
      // save scroll of the panel we're leaving
      const leaving = panelRefs.current[prev];
      if (leaving) panelScrollTops.current[prev] = leaving.scrollTop;
    }
    // restore scroll of the panel we're entering (after paint)
    requestAnimationFrame(() => {
      const entering = panelRefs.current[active];
      if (entering) entering.scrollTop = panelScrollTops.current[active];
    });
    prevActive.current = active;
  }, [active]);

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
            <span className="text-base font-bold text-foreground">Advize Store</span>
          </Link>
          <div className="sm:hidden flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              onClick={toggleDark}
              className="rounded-full h-8 w-8"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={handleSignOut}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

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

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">{store?.name ?? "My Shop"}</span>
            <Button
              variant="ghost" size="icon"
              onClick={toggleDark}
              className="rounded-full h-8 w-8"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={handleSignOut}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
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
            <div ref={el => { panelRefs.current[0] = el; }} className="w-full flex-shrink-0 h-full overflow-y-auto">
              <HomePanel products={products} analytics={analytics} store={store} />
            </div>

            <div ref={el => { panelRefs.current[1] = el; }} className="w-full flex-shrink-0 h-full overflow-y-auto">
              <MyStorePanel
                store={store}
                products={products}
                onLogoChange={(url) => setStore(prev => prev ? { ...prev, logo_url: url } : prev)}
                onStoreChange={(updated) => setStore(updated)}
              />
            </div>

            <div ref={el => { panelRefs.current[2] = el; }} className="w-full flex-shrink-0 h-full overflow-y-auto">
              <ListingsPanel
                products={products}
                onRefresh={() => store?.id && loadData(store.id)}
                onProductsChange={(updated) =>
                  setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
                }
                onDeleteProduct={(id) =>
                  setProducts(prev => prev.filter(p => p.id !== id))
                }
              />
            </div>

            <div ref={el => { panelRefs.current[3] = el; }} className="w-full flex-shrink-0 h-full overflow-y-auto">
              <PluginsPanel store={store} onGoToMyStore={() => setActive(1)} />
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
