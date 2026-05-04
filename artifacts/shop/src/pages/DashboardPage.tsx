import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  Package, TrendingUp, ShoppingBag, Plus, Boxes,
  Store, LayoutDashboard, ListOrdered, Star, Loader2,
  QrCode, Moon, Sun, Share2, Copy, Check, LogOut, Flame, Camera,
  Pencil, Phone, MapPin, Tag, Mail, FileText,
  Puzzle, CreditCard, Globe, Truck, Lock, Sparkles, ExternalLink, Bike,
  ShoppingCart, IndianRupee, PackageCheck, Clock, AlertCircle,
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
import { getProducts, getAnalytics, updateProduct, updateStore, uploadImage, onboardRazorpay, getOrderStats, updateOrderStatus, type AnalyticsSummary, type OrderStats, type Order, type OrderStatus } from "@/lib/api";
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
            <Button
              asChild
              size="sm"
              variant="outline"
              className="w-full rounded-full text-xs"
            >
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1.5" />
                Visit Store
              </a>
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
          <Button asChild variant="outline" className="w-full rounded-full" size="sm">
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Visit Store
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── panels ─────────────────────────────────────────── */
function HomePanel({ products, analytics, store, orderStats }: {
  products: Product[];
  analytics: AnalyticsSummary | null;
  store: StoreType | null;
  orderStats: OrderStats | null;
}) {
  const inStockCount = products.filter(p => p.units > 0).length;
  const outCount = products.filter(p => p.units === 0).length;
  const totalUnits = products.reduce((s, p) => s + p.units, 0);
  const avgStoreRating = analytics?.avgRating ?? "–";
  const storeUrl = store?.slug
    ? `https://store.advize.in/store/${store.slug}`
    : "";
  const paymentActive = !!(store?.razorpay_account_id || store?.razorpay_key_id);

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

      {/* ── Orders Summary (payment stores only) ─────────── */}
      {paymentActive && (
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Orders Summary</p>
            {orderStats && (
              <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
                {orderStats.totalOrders} total
              </span>
            )}
          </div>
          {orderStats ? (
            <div className="grid grid-cols-2 divide-x divide-y">
              <div className="px-4 py-3 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <IndianRupee className="h-3 w-3" />
                  <span className="text-[10px] font-medium">Revenue</span>
                </div>
                <p className="text-lg font-extrabold text-foreground">
                  ₹{orderStats.totalRevenueRupees.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="px-4 py-3 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <ShoppingCart className="h-3 w-3" />
                  <span className="text-[10px] font-medium">Total Orders</span>
                </div>
                <p className="text-lg font-extrabold text-foreground">{orderStats.totalOrders}</p>
              </div>
              <div className="px-4 py-3 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px] font-medium">Pending</span>
                </div>
                <p className="text-base font-bold text-amber-500">{orderStats.pendingOrders}</p>
              </div>
              <div className="px-4 py-3 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-green-500">
                  <PackageCheck className="h-3 w-3" />
                  <span className="text-[10px] font-medium">Delivered</span>
                </div>
                <p className="text-base font-bold text-green-500">{orderStats.deliveredOrders}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <AlertCircle className="h-8 w-8 opacity-20" />
              <p className="text-xs font-medium">No orders yet</p>
              <p className="text-[11px]">Orders will appear here after customers pay.</p>
            </div>
          )}
        </div>
      )}

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
  const [editEmail, setEditEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editTerms, setEditTerms] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    setEditName(store?.name ?? "");
    setEditPhone(store?.whatsapp ?? "");
    setEditLocation(store?.location ?? "");
    setEditCategory(store?.category ?? "");
    setEditRazorpayKeyId(store?.razorpay_key_id ?? "");
    setEditRazorpaySecret("");
    setEditEmail(store?.email ?? "");
    setEditContactPhone(store?.contact_phone ?? "");
    setEditTerms(store?.terms_and_conditions ?? "");
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
        email: editEmail.trim(),
        contact_phone: editContactPhone.trim(),
        terms_and_conditions: editTerms.trim(),
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
    ? `https://store.advize.in/store/${store.slug}`
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

          {/* ── Contact & Legal section ── */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-purple-500" />
              <p className="text-sm font-semibold">Contact &amp; Legal Info</p>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Shown in your store's footer. Helps customers reach you and builds trust.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Business Email</label>
                <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="e.g. shop@example.com" className="h-11 rounded-xl" type="email" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Contact Phone</label>
                <Input value={editContactPhone} onChange={e => setEditContactPhone(e.target.value)} placeholder="e.g. 9876543210" className="h-11 rounded-xl" type="tel" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Terms &amp; Conditions</label>
                <textarea
                  value={editTerms}
                  onChange={e => setEditTerms(e.target.value)}
                  placeholder="Enter your store's terms and conditions, return policy, shipping info, etc."
                  rows={5}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
              </div>
            </div>
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
const BIZ_TYPES = [
  { value: "proprietorship",  label: "Proprietorship" },
  { value: "individual",      label: "Individual" },
  { value: "partnership",     label: "Partnership" },
  { value: "private_limited", label: "Private Limited" },
  { value: "public_limited",  label: "Public Limited" },
  { value: "llp",             label: "LLP" },
  { value: "ngo",             label: "NGO / Trust" },
  { value: "other",           label: "Other" },
];

const BIZ_CATEGORIES = [
  { value: "ecommerce",        sub: "fashion_and_lifestyle",    label: "Fashion & Lifestyle" },
  { value: "ecommerce",        sub: "beauty_and_personal_care", label: "Beauty & Personal Care" },
  { value: "ecommerce",        sub: "electronics",              label: "Electronics" },
  { value: "ecommerce",        sub: "home_furnishings",         label: "Home & Furniture" },
  { value: "ecommerce",        sub: "grocery",                  label: "Grocery" },
  { value: "ecommerce",        sub: "books_and_stationery",     label: "Books & Stationery" },
  { value: "ecommerce",        sub: "health_and_wellness",      label: "Health & Wellness" },
  { value: "food",             sub: "online_food_ordering",     label: "Food & Beverages" },
  { value: "education",        sub: "education",                label: "Education" },
  { value: "healthcare",       sub: "pharmacy",                 label: "Healthcare / Pharmacy" },
  { value: "ecommerce",        sub: "general_merchandise",      label: "General / Other" },
];

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  created:   "Account Created — KYC Pending",
  activated: "Active",
  suspended: "Suspended",
  under_review: "Under Review",
  needs_clarification: "Needs Clarification",
};

function PluginsPanel({ store, onStoreChange }: { store: StoreType | null; onStoreChange: (updated: StoreType) => void }) {
  const { toast } = useToast();
  const hasAccount = !!(store?.razorpay_account_id);
  const legacyKeys  = !!(store?.razorpay_key_id) && !hasAccount;
  const paymentActive = hasAccount || legacyKeys;

  const [showOnboard, setShowOnboard] = useState(false);
  const [saving, setSaving]           = useState(false);

  const [bizName,    setBizName]    = useState("");
  const [contactName, setContactName] = useState("");
  const [bizType,    setBizType]    = useState("proprietorship");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [pan,        setPan]        = useState("");
  const [catIndex,   setCatIndex]   = useState(0);
  const [street,     setStreet]     = useState("");
  const [city,       setCity]       = useState("");
  const [bizState,   setBizState]   = useState("");
  const [pincode,    setPincode]    = useState("");

  const openOnboard = () => {
    setBizName(store?.name ?? "");
    setContactName("");
    setBizType("proprietorship");
    setEmail("");
    setPhone("");
    setPan("");
    setCatIndex(0);
    setStreet("");
    setCity("");
    setBizState("");
    setPincode("");
    setShowOnboard(true);
  };

  const handleOnboard = async () => {
    if (!store?.id) return;
    if (!bizName.trim() || !contactName.trim() || !email.trim() ||
        !phone.trim() || !pan.trim() || !city.trim() || !bizState.trim() || !pincode.trim()) {
      toast({ variant: "destructive", title: "Please fill all required fields" });
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan.trim())) {
      toast({ variant: "destructive", title: "Invalid PAN", description: "PAN should be like ABCDE1234F" });
      return;
    }
    const cat = BIZ_CATEGORIES[catIndex];
    setSaving(true);
    try {
      const result = await onboardRazorpay({
        store_id:             store.id,
        legal_business_name:  bizName.trim(),
        contact_name:         contactName.trim(),
        business_type:        bizType,
        email:                email.trim(),
        phone:                phone.trim(),
        pan:                  pan.trim().toUpperCase(),
        category:             cat.value,
        subcategory:          cat.sub,
        street1:              street.trim() || city.trim(),
        city:                 city.trim(),
        state:                bizState.trim(),
        postal_code:          pincode.trim(),
      });
      onStoreChange({ ...store, razorpay_account_id: result.account_id, razorpay_account_status: result.status });
      setShowOnboard(false);
      toast({
        title: "Razorpay Account Created! 🎉",
        description: `Account ID: ${result.account_id}. Razorpay will guide you through KYC to activate payments.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Connection Failed", description: err.message ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  };

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

        {/* ── Payment Integration (Razorpay Partner) ── */}
        <div className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${paymentActive ? "border-green-400/60 dark:border-green-600/40" : ""}`}>
          <div className="p-5">
            <div className="flex gap-4 items-start">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl flex-shrink-0">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-base font-semibold text-foreground leading-tight">Razorpay Payments</h3>
                  {hasAccount ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      Connected
                    </span>
                  ) : legacyKeys ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      Legacy
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      Available
                    </span>
                  )}
                </div>

                {hasAccount ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {ACCOUNT_STATUS_LABEL[store?.razorpay_account_status ?? ""] ?? "Account created."}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground/60 truncate">
                      {store?.razorpay_account_id}
                    </p>
                    <a
                      href="https://dashboard.razorpay.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs font-semibold text-primary underline underline-offset-2 mt-1"
                    >
                      Complete KYC on Razorpay →
                    </a>
                  </div>
                ) : legacyKeys ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      You're using your own Razorpay API keys. Upgrade to the Partner flow for a seamless, no-API-key experience.
                    </p>
                    {!showOnboard && (
                      <button
                        onClick={openOnboard}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Upgrade to Partner Flow
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Accept UPI, cards & wallets. No API keys needed — we handle Razorpay setup for you.
                    </p>
                    {!showOnboard && (
                      <button
                        onClick={openOnboard}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Connect Razorpay
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Partner onboarding form ── */}
          {showOnboard && (
            <div className="border-t bg-muted/30 px-5 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Business Details</p>
                <button
                  onClick={() => setShowOnboard(false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Cancel
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground -mt-2">
                Razorpay will verify your business and handle KYC — no manual API keys needed.
              </p>

              {/* Row 1 */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Legal Business Name *</label>
                <Input value={bizName} onChange={e => setBizName(e.target.value)}
                  placeholder="e.g. Acme Traders" className="h-10 rounded-xl text-sm bg-background" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Contact Name (Owner / Director) *</label>
                <Input value={contactName} onChange={e => setContactName(e.target.value)}
                  placeholder="Full name" className="h-10 rounded-xl text-sm bg-background" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Business Type *</label>
                  <select
                    value={bizType}
                    onChange={e => setBizType(e.target.value)}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {BIZ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                  <select
                    value={catIndex}
                    onChange={e => setCatIndex(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {BIZ_CATEGORIES.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Business Email *</label>
                  <Input value={email} onChange={e => setEmail(e.target.value)}
                    type="email" placeholder="you@business.com"
                    className="h-10 rounded-xl text-sm bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Phone *</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)}
                    type="tel" placeholder="9876543210"
                    className="h-10 rounded-xl text-sm bg-background" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">PAN Number *</label>
                <Input value={pan} onChange={e => setPan(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F" maxLength={10}
                  className="h-10 rounded-xl font-mono text-sm bg-background tracking-widest"
                  autoCorrect="off" autoCapitalize="characters" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Street Address</label>
                <Input value={street} onChange={e => setStreet(e.target.value)}
                  placeholder="Shop / flat / street" className="h-10 rounded-xl text-sm bg-background" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">City *</label>
                  <Input value={city} onChange={e => setCity(e.target.value)}
                    placeholder="Mumbai" className="h-10 rounded-xl text-sm bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">State *</label>
                  <Input value={bizState} onChange={e => setBizState(e.target.value)}
                    placeholder="Maharashtra" className="h-10 rounded-xl text-sm bg-background" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">PIN Code *</label>
                <Input value={pincode} onChange={e => setPincode(e.target.value)}
                  placeholder="400001" maxLength={6} inputMode="numeric"
                  className="h-10 rounded-xl text-sm bg-background" />
              </div>

              <Button
                onClick={handleOnboard}
                disabled={saving}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-transparent"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? "Creating Account..." : "Connect Razorpay"}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                Razorpay will send a KYC link to your email after account creation.
              </p>
            </div>
          )}
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

        {/* ── Delivery Partners ── */}
        <div className="bg-card border rounded-2xl p-5 flex gap-4 items-start shadow-sm opacity-75">
          <div className="bg-green-50 dark:bg-green-950/40 p-3 rounded-xl flex-shrink-0">
            <Bike className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold text-foreground leading-tight">Delivery Partners</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect with Dunzo, Porter, Shiprocket & more to offer fast local and national delivery to your customers.
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>

        {/* ── Custom Templates ── */}
        <div className="bg-card border rounded-2xl p-5 flex gap-4 items-start shadow-sm opacity-75">
          <div className="bg-teal-50 dark:bg-teal-950/40 p-3 rounded-xl flex-shrink-0">
            <Sparkles className="h-6 w-6 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold text-foreground leading-tight">Custom Templates</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose from beautiful storefront templates to give your shop a unique look and feel.
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>

      </div>

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
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async (storeId: string, hasPayment: boolean) => {
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
    // order stats fetched independently so any failure doesn't break products
    if (hasPayment) {
      getOrderStats(storeId).then(setOrderStats).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (store?.id) {
      const hasPayment = !!(store.razorpay_account_id || store.razorpay_key_id);
      loadData(store.id, hasPayment);
    }
  }, [store?.id, store?.razorpay_account_id, store?.razorpay_key_id, loadData]);

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
    <div className="h-[100dvh] flex flex-col bg-muted/10 overflow-hidden">

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-xl overflow-hidden w-7 h-7 flex items-center justify-center">
              {store?.logo_url
                ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                : <Store className="h-4 w-4 text-primary" />}
            </div>
            <span className="text-base font-bold text-foreground">
              {store?.name ?? "My Shop"}
            </span>
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

          <div className="hidden sm:flex lg:hidden items-center gap-1 bg-muted rounded-full p-1">
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

          <div className="hidden sm:flex lg:hidden items-center gap-2">
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
        <div className="flex-1 overflow-hidden flex">

          {/* ── Desktop sidebar ────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col w-56 border-r bg-background/60 shrink-0">
            <div className="flex-1 py-4 flex flex-col gap-0.5">
              {TABS.map((tab, i) => {
                const Icon = tab.icon;
                const isActive = active === i;
                return (
                  <button
                    key={tab.label}
                    onClick={() => setActive(i)}
                    className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="border-t mx-3 pt-3 pb-4 flex flex-col gap-0.5">
              <button
                onClick={toggleDark}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                {dark ? "Light mode" : "Dark mode"}
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-muted transition-all"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </aside>

          {/* ── Mobile: swipeable carousel ─────────────────────── */}
          <div
            className="lg:hidden flex-1 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex h-full transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              <div ref={el => { panelRefs.current[0] = el; }} className="w-full flex-shrink-0 h-full overflow-y-auto">
                <HomePanel products={products} analytics={analytics} store={store} orderStats={orderStats} />
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
                <PluginsPanel store={store} onStoreChange={(updated) => setStore(updated)} />
              </div>
            </div>
          </div>

          {/* ── Desktop: active panel (no carousel) ────────────── */}
          <div className="hidden lg:flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {active === 0 && <HomePanel products={products} analytics={analytics} store={store} orderStats={orderStats} />}
              {active === 1 && (
                <MyStorePanel
                  store={store}
                  products={products}
                  onLogoChange={(url) => setStore(prev => prev ? { ...prev, logo_url: url } : prev)}
                  onStoreChange={(updated) => setStore(updated)}
                />
              )}
              {active === 2 && (
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
              )}
              {active === 3 && <PluginsPanel store={store} onStoreChange={(updated) => setStore(updated)} />}
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
