import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  Package, TrendingUp, ShoppingBag, Plus, Boxes,
  Store, LayoutDashboard, ListOrdered, Star, Loader2,
  QrCode, Moon, Sun, Share2, Copy, Check, LogOut, Flame, Camera,
  Pencil, Phone, MapPin, Tag, Mail, FileText, Download,
  Puzzle, CreditCard, Globe, Truck, Lock, Sparkles, ExternalLink, Bike, Printer, Zap, ChevronDown, MessageCircle, Gift,
  ShoppingCart, IndianRupee, PackageCheck, Clock, AlertCircle,
  Settings, Bell, Shield, User, ChevronRight, HelpCircle, Trash2,
  Search, X, SlidersHorizontal,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ProductCard } from "@/components/ProductCard";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { useStore } from "@/hooks/use-store";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTitle,
} from "@/components/ui/sheet";
import { getProducts, getAnalytics, updateProduct, updateStore, uploadImage, getOrderStats, updateOrderStatus, requestPayout, getPayoutRequests, getIgRules, createIgRule, updateIgRule, deleteIgRule, disconnectInstagram, testInstagramConnection, type AnalyticsSummary, type OrderStats, type Order, type OrderStatus, type PayoutRequest, type IgRule, type IgTestResult } from "@/lib/api";
import { WhatsAppMarketingPlugin } from "@/components/WhatsAppMarketingPlugin";
import { bustStorefrontCache } from "@/pages/StorefrontPage";
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

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const pad = 24;
    const out = document.createElement("canvas");
    out.width = canvas.width + pad * 2;
    out.height = canvas.height + pad * 2;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, pad, pad);
    const a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = `${storeName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    a.click();
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
              onClick={handleDownload}
              size="sm"
              variant="outline"
              className="w-full rounded-full text-xs"
              data-testid="btn-download-qr"
            >
              <Download className="h-3 w-3 mr-1.5" />
              Download PNG
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
          <Button
            onClick={handleDownload}
            variant="outline"
            className="w-full rounded-full"
            size="sm"
            data-testid="btn-download-qr-full"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download PNG
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── panels ─────────────────────────────────────────── */
function HomePanel({ products, analytics, store, orderStats, loading = false, onLoyaltyClick }: {
  products: Product[];
  analytics: AnalyticsSummary | null;
  store: StoreType | null;
  orderStats: OrderStats | null;
  loading?: boolean;
  onLoyaltyClick?: () => void;
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full shadow-sm text-xs border-amber-300 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={onLoyaltyClick}
          >
            <Gift className="h-3.5 w-3.5 mr-1" />Loyalty
          </Button>
        </div>
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

      {loading && !analytics ? (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[0,1,2,3].map(i => <Skeleton key={i} className="flex-1 h-[72px] rounded-2xl min-w-[70px]" />)}
        </div>
      ) : (
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
      )}

      {loading && !analytics ? (
        <Skeleton className="h-14 w-full rounded-2xl" />
      ) : (
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
      )}

      {/* QR code compact card */}
      {storeUrl && (
        <QrCodeCard storeUrl={storeUrl} storeName={store?.name ?? "store"} compact />
      )}

      <AnalyticsSection liveData={analytics} />
    </div>
  );
}

function MyStorePanel({ store, products, onLogoChange, onStoreChange, editTrigger = 0 }: {
  store: StoreType | null;
  products: Product[];
  onLogoChange: (url: string) => void;
  editTrigger?: number;
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
  const [editDeliveryCharge, setEditDeliveryCharge] = useState("");
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
    setEditDeliveryCharge(store?.delivery_charge != null ? String(store.delivery_charge) : "");
    setShowSecret(false);
    setEditing(true);
  };

  useEffect(() => {
    if (editTrigger > 0) openEdit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTrigger]);

  const handleSaveStore = async () => {
    if (!store?.id) return;
    setSaving(true);
    try {
      const deliveryChargeParsed = parseFloat(editDeliveryCharge);
      const payload: Record<string, any> = {
        name: editName.trim() || store.name,
        whatsapp: editPhone.trim(),
        location: editLocation.trim(),
        category: editCategory.trim(),
        email: editEmail.trim(),
        contact_phone: editContactPhone.trim(),
        terms_and_conditions: editTerms.trim(),
        delivery_charge: (!isNaN(deliveryChargeParsed) && deliveryChargeParsed >= 0)
          ? deliveryChargeParsed
          : 0,
      };
      if (editRazorpayKeyId.trim()) payload.razorpay_key_id = editRazorpayKeyId.trim();
      if (editRazorpaySecret.trim()) payload.razorpay_key_secret = editRazorpaySecret.trim();
      const hasRazorpay = !!(editRazorpayKeyId.trim() || store.razorpay_key_id);
      payload.razorpay_enabled = hasRazorpay;
      const updated = await updateStore(store.id, payload);
      onStoreChange(updated);
      bustStorefrontCache(store.slug);
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
      {/* ── Store header card ── */}
      <div className="bg-card border-b px-4 pt-5 pb-4">
        <div className="flex items-center gap-4">
          {/* Tappable logo */}
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
            className="relative w-16 h-16 shrink-0 group"
            title="Tap to change logo"
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary/10 shadow-sm border flex items-center justify-center text-primary">
              {store?.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-8 h-8" />
              )}
            </div>
            <div className={`absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center transition-opacity ${
              logoUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}>
              {logoUploading
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Camera className="w-4 h-4 text-white" />}
            </div>
          </button>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />

          <div className="flex-1 min-w-0 pr-8">
            <h2 className="text-lg font-bold text-foreground truncate">{store?.name ?? "My Shop"}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {store?.category && (
                <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {store.category}
                </span>
              )}
              {store?.location && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />{store.location}
                </span>
              )}
            </div>
            {store?.whatsapp && (
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />{store.whatsapp}
              </p>
            )}
          </div>
        </div>

        {/* Quick action pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-0.5 no-scrollbar">
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted-foreground/15 text-xs font-medium text-foreground shrink-0 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Store
            </a>
          )}
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 text-xs font-medium text-primary shrink-0 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Details
          </button>
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

          {/* ── Delivery Charge ── */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Delivery Charge (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₹</span>
              <Input
                value={editDeliveryCharge}
                onChange={e => setEditDeliveryCharge(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0"
                className="h-11 rounded-xl pl-7"
                inputMode="decimal"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Set to 0 for free delivery. Shown to customers at checkout.</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {products.map(product => (
              <ProductCard key={product.id} product={product} showActions={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingsPanel({ products, onRefresh, onProductsChange, onDeleteProduct, searchQuery = "", loading = false }: {
  products: Product[];
  onRefresh: () => void;
  onProductsChange: (updated: Product) => void;
  onDeleteProduct: (id: string) => void;
  searchQuery?: string;
  loading?: boolean;
}) {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = ["All", ...Array.from(new Set(products.map(p => (p as any).category).filter(Boolean)))];

  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "All" || (p as any).category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
    <div className="pb-28">
      {/* Panel header */}
      <div className="px-3 pt-4 pb-3 border-b bg-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">My Listings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length === products.length
                ? `${products.length} products`
                : `${filtered.length} of ${products.length} products`}
            </p>
          </div>
          <Link href="/add-product">
            <button className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />
              List New Product
            </button>
          </Link>
        </div>

        {/* Category filter pills */}
        {categories.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-2.5 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <Skeleton className="h-5 w-1/3 rounded mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No products yet</p>
            <p className="text-sm mt-1">Add your first product to get started!</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No results found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
              Tap <span className="inline-flex items-center gap-0.5 text-orange-500 font-semibold"><Flame className="h-3 w-3" /> flame</span> to pin a product to the Trending section on your store.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {filtered.map(product => (
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
    </div>
  );
}

/* ── Instagram DM Automation Plugin ─────────────────── */
function IgIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function InstagramPlugin({ store, onStoreChange }: {
  store: StoreType | null;
  onStoreChange: (s: StoreType) => void;
}) {
  const { toast } = useToast();
  const connected = !!(store?.ig_user_id);

  const [open, setOpen]                   = useState(false);
  const [rules, setRules]                 = useState<IgRule[]>([]);
  const [loadingRules, setLoadingRules]   = useState(false);
  const [rulesFetched, setRulesFetched]   = useState(false);
  const [showForm, setShowForm]           = useState(false);
  const [editingRule, setEditingRule]     = useState<IgRule | null>(null);
  const [keyword, setKeyword]             = useState("");
  const [matchType, setMatchType]         = useState<"exact" | "contains" | "starts_with">("contains");
  const [reply, setReply]                 = useState("");
  const [savingRule, setSavingRule]       = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testing, setTesting]             = useState(false);
  const [testResult, setTestResult]       = useState<IgTestResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ig_connected") === "1") {
      setOpen(true);
      toast({ title: "Instagram connected!", description: "Your account is linked. Add keyword rules below." });
      const url = new URL(window.location.href);
      url.searchParams.delete("ig_connected");
      window.history.replaceState({}, "", url.toString());
    }
    const igErr = params.get("ig_error");
    if (igErr) {
      setOpen(true);
      toast({ variant: "destructive", title: "Instagram connection failed", description: decodeURIComponent(igErr) });
      const url = new URL(window.location.href);
      url.searchParams.delete("ig_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (!open || !connected || !store?.id || rulesFetched) return;
    setLoadingRules(true);
    getIgRules(store.id)
      .then(r => { setRules(r.rules); setRulesFetched(true); })
      .catch(() => {})
      .finally(() => setLoadingRules(false));
  }, [open, connected, store?.id]);

  const resetForm = () => {
    setKeyword(""); setMatchType("contains"); setReply("");
    setEditingRule(null); setShowForm(false);
  };

  const openEdit = (rule: IgRule) => {
    setEditingRule(rule);
    setKeyword(rule.keyword);
    setMatchType(rule.match_type);
    setReply(rule.reply);
    setShowForm(true);
  };

  const handleSaveRule = async () => {
    if (!store?.id || !keyword.trim() || !reply.trim()) {
      toast({ variant: "destructive", title: "Keyword and reply are required" });
      return;
    }
    setSavingRule(true);
    try {
      if (editingRule) {
        await updateIgRule(store.id, editingRule.id, {
          keyword: keyword.trim(), match_type: matchType, reply: reply.trim(),
        });
        setRules(prev => prev.map(r =>
          r.id === editingRule.id ? { ...r, keyword: keyword.trim(), match_type: matchType, reply: reply.trim() } : r
        ));
        toast({ title: "Rule updated!" });
      } else {
        const newRule = await createIgRule(store.id, {
          keyword: keyword.trim(), match_type: matchType, reply: reply.trim(), enabled: true,
        });
        setRules(prev => [...prev, newRule]);
        toast({ title: "Rule added!" });
      }
      resetForm();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setSavingRule(false);
    }
  };

  const handleToggle = async (rule: IgRule) => {
    if (!store?.id) return;
    const next = !rule.enabled;
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: next } : r));
    try { await updateIgRule(store.id, rule.id, { enabled: next }); }
    catch { setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !next } : r)); }
  };

  const handleDelete = async (ruleId: string) => {
    if (!store?.id) return;
    setRules(prev => prev.filter(r => r.id !== ruleId));
    try { await deleteIgRule(store.id, ruleId); }
    catch (e: any) { toast({ variant: "destructive", title: "Delete failed", description: e.message }); }
  };

  const handleConnect = () => {
    if (!store?.id) return;
    window.location.href = `${import.meta.env.BASE_URL}api/instagram/connect?store_id=${store.id}`;
  };

  const handleDisconnect = async () => {
    if (!store?.id) return;
    setDisconnecting(true);
    try {
      await disconnectInstagram(store.id);
      onStoreChange({ ...store, ig_user_id: undefined, ig_username: undefined });
      setRules([]); setRulesFetched(false);
      setTestResult(null);
      toast({ title: "Instagram disconnected" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally { setDisconnecting(false); }
  };

  const handleTest = async () => {
    if (!store?.id) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testInstagramConnection(store.id);
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message ?? "Request failed" });
    } finally { setTesting(false); }
  };

  const MATCH_LABELS: Record<string, string> = {
    exact: "Exact", contains: "Contains", starts_with: "Starts with",
  };

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
      <button
        className="w-full p-5 flex gap-4 items-center text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${connected ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" : "bg-gradient-to-tr from-yellow-300/50 via-pink-400/50 to-purple-500/50"}`}>
          <IgIcon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-base font-semibold text-foreground leading-tight">Instagram DM Automation</h3>
            {connected ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Connected</span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Not connected</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Auto-reply to DMs using keyword rules</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t">
          <div className="p-5 space-y-4">
            {!connected ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect your Instagram Business account to automatically reply to customer DMs based on keywords — no manual effort needed.
                </p>

                {/* ── Setup Steps ── */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide">Setup Instructions</p>

                  {[
                    {
                      step: 1,
                      title: "Switch to a Business or Creator account",
                      detail: "On Instagram → Settings → Account → Switch to Professional Account. Choose Business or Creator.",
                    },
                    {
                      step: 2,
                      title: "Link your Instagram to a Facebook Page",
                      detail: "Instagram → Settings → Account → Linked Accounts → Facebook. If you don't have a Facebook Page, create one first at facebook.com/pages/create.",
                    },
                    {
                      step: 3,
                      title: "Enable message access on Facebook",
                      detail: 'On your Facebook Page → Settings → Privacy → Messaging → turn on "Allow people to contact my Page privately". Also enable "Connected Tools — Allow access to messages".',
                    },
                    {
                      step: 4,
                      title: "Click Connect Instagram below",
                      detail: 'Log in with the Facebook account that manages your Page. Accept all requested permissions — especially "Manage messages" and "Instagram messages".',
                    },
                    {
                      step: 5,
                      title: "Add keyword rules",
                      detail: 'Once connected, add rules like: keyword "price" → reply "Hi! Check our latest prices here: store.advize.in/store/yourstore". Rules fire whenever a DM contains your keyword.',
                    },
                  ].map(({ step, title, detail }) => (
                    <div key={step} className="flex gap-3 bg-muted/40 border rounded-xl px-3 py-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                        {step}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-snug">{title}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-semibold mb-1">Before you click Connect, make sure:</p>
                  <p>• Your Instagram is a Business or Creator account</p>
                  <p>• It is linked to a Facebook Page you manage</p>
                  <p>• You are logged into the correct Facebook account</p>
                </div>

                <button
                  onClick={handleConnect}
                  className="inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-orange-400 via-pink-600 to-purple-600 hover:opacity-90 text-white px-4 py-2.5 rounded-xl transition-opacity"
                >
                  <IgIcon className="h-4 w-4 text-white" />
                  Connect Instagram
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex-shrink-0">
                      <IgIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">@{store?.ig_username || "your_account"}</p>
                      <p className="text-xs text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {testing ? "Testing…" : "Test Connection"}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      {disconnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Disconnect
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div className={`rounded-xl border px-4 py-3 text-xs space-y-1.5 ${testResult.ok ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
                    <p className={`font-semibold ${testResult.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      {testResult.ok ? "✓ Connection healthy" : "✗ " + (testResult.error ?? "Connection issue")}
                    </p>
                    {testResult.ok && (
                      <>
                        {testResult.days_until_expiry != null && (
                          <p className="text-muted-foreground">Token expires in <span className="font-semibold text-foreground">{testResult.days_until_expiry} days</span> ({testResult.token_expires_at?.slice(0, 10)})</p>
                        )}
                        {testResult.has_messages_permission === false && (
                          <p className="text-amber-700 dark:text-amber-400 font-medium">⚠ Missing messaging permission — auto-DM will not work. Reconnect Instagram and accept all permissions.</p>
                        )}
                        {testResult.has_messages_permission && (
                          <p className="text-green-700 dark:text-green-400">✓ Messaging permission granted</p>
                        )}
                      </>
                    )}
                    {!testResult.ok && testResult.step && (
                      <p className="text-muted-foreground">Failed at: <span className="font-mono">{testResult.step}</span></p>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {connected && (
            <div className="border-t px-5 pb-5 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Keyword Rules
                  {rules.length > 0 && <span className="ml-1 font-normal text-muted-foreground">({rules.length})</span>}
                </p>
                {!showForm && (
                  <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Rule
                  </button>
                )}
              </div>

              {showForm && (
                <div className="bg-muted/40 border rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">{editingRule ? "Edit Rule" : "New Rule"}</p>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Keyword</label>
                    <Input
                      value={keyword}
                      onChange={e => setKeyword(e.target.value)}
                      placeholder="e.g. price, available, where to buy"
                      className="h-9 rounded-lg text-sm bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Match Type</label>
                    <select
                      value={matchType}
                      onChange={e => setMatchType(e.target.value as any)}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="contains">Contains keyword</option>
                      <option value="exact">Exact message</option>
                      <option value="starts_with">Starts with keyword</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Auto-Reply Message</label>
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="e.g. Thanks for reaching out! Our price starts at ₹499. Tap the link to order 👇"
                      rows={3}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveRule}
                      disabled={savingRule}
                      className="flex-1 h-9 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {savingRule && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {editingRule ? "Save Changes" : "Add Rule"}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 h-9 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg transition-colors"
                    >Cancel</button>
                  </div>
                </div>
              )}

              {loadingRules ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : rules.length === 0 && !showForm ? (
                <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-xl">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No rules yet</p>
                  <p className="text-xs mt-0.5">Add a rule to start auto-replying to customer DMs.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className={`bg-background border rounded-xl px-4 py-3 flex gap-3 items-start transition-opacity ${rule.enabled ? "" : "opacity-50"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-xs font-mono font-semibold bg-muted px-2 py-0.5 rounded">{rule.keyword}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{MATCH_LABELS[rule.match_type]}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{rule.reply}</p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => handleToggle(rule)}
                          className="scale-75 origin-right"
                        />
                        <button
                          onClick={() => openEdit(rule)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        ><Pencil className="h-3.5 w-3.5" /></button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        ><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Rules are matched in order — the first matching keyword wins. Matching is case-insensitive.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Plugins Panel ───────────────────────────────────── */
function PluginsPanel({ store, onStoreChange }: {
  store: StoreType | null;
  onStoreChange: (updated: StoreType) => void;
}) {
  const { toast } = useToast();
  const razorpayActive = !!(store?.razorpay_key_id);
  const advizeEnabled  = !!(store?.advize_payment_enabled);

  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [savingAdvize, setSavingAdvize] = useState(false);

  // Razorpay direct key form
  const [showRzpForm, setShowRzpForm]     = useState(false);
  const [rzpKeyId, setRzpKeyId]           = useState("");
  const [rzpSecret, setRzpSecret]         = useState("");
  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [savingRzp, setSavingRzp]         = useState(false);
  const handleToggleAdvize = async () => {
    if (!store?.id) return;
    setSavingAdvize(true);
    try {
      const updated = await updateStore(store.id, { advize_payment_enabled: !advizeEnabled });
      onStoreChange(updated);
      toast({ title: advizeEnabled ? "Advize Payment disabled" : "Advize Payment enabled!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message ?? "Please try again." });
    } finally {
      setSavingAdvize(false);
    }
  };

  const openRzpForm = () => {
    setRzpKeyId(store?.razorpay_key_id ?? "");
    setRzpSecret("");
    setShowRzpSecret(false);
    setShowRzpForm(true);
  };

  const handleSaveRzp = async () => {
    if (!store?.id) return;
    const keyId = rzpKeyId.trim();
    const secret = rzpSecret.trim();
    if (!keyId) {
      toast({ variant: "destructive", title: "Key ID is required" });
      return;
    }
    if (!secret && !razorpayActive) {
      toast({ variant: "destructive", title: "Secret Key is required for first-time setup" });
      return;
    }
    setSavingRzp(true);
    try {
      const payload: Record<string, any> = {
        razorpay_key_id: keyId,
        razorpay_enabled: true,
      };
      if (secret) payload.razorpay_key_secret = secret;
      const updated = await updateStore(store.id, payload);
      onStoreChange(updated);
      setShowRzpForm(false);
      toast({ title: "Razorpay connected!", description: "Customers can now pay with UPI, cards and wallets." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save", description: err.message ?? "Please try again." });
    } finally {
      setSavingRzp(false);
    }
  };

  const handleRemoveRzp = async () => {
    if (!store?.id) return;
    setSavingRzp(true);
    try {
      const updated = await updateStore(store.id, { razorpay_key_id: "", razorpay_enabled: false });
      onStoreChange(updated);
      setShowRzpForm(false);
      toast({ title: "Razorpay disconnected" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message ?? "Please try again." });
    } finally {
      setSavingRzp(false);
    }
  };

  const anyPaymentActive = advizeEnabled || razorpayActive;

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

        {/* ── Payment Gateway (accordion) ── */}
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          {/* Header row – click to expand */}
          <button
            className="w-full p-5 flex gap-4 items-center text-left"
            onClick={() => setShowPaymentOptions(p => !p)}
          >
            <div className={`p-3 rounded-xl flex-shrink-0 ${anyPaymentActive ? "bg-green-50 dark:bg-green-950/40" : "bg-primary/10"}`}>
              <CreditCard className={`h-6 w-6 ${anyPaymentActive ? "text-green-600 dark:text-green-400" : "text-primary"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className="text-base font-semibold text-foreground leading-tight">Payment Gateway</h3>
                {razorpayActive && advizeEnabled ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">2 Active</span>
                ) : razorpayActive ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Razorpay Active</span>
                ) : advizeEnabled ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Advize Active</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Not set up</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Choose how to accept payments in your store</p>
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${showPaymentOptions ? "rotate-180" : ""}`} />
          </button>

          {/* Expanded: both options */}
          {showPaymentOptions && (
            <div className="border-t divide-y">

              {/* ── Option 1: Razorpay (own keys) ── */}
              <div>
                <div className="p-5">
                  <div className="flex gap-4 items-start">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${razorpayActive ? "bg-green-50 dark:bg-green-950/40" : "bg-blue-50 dark:bg-blue-950/40"}`}>
                      <CreditCard className={`h-6 w-6 ${razorpayActive ? "text-green-600 dark:text-green-400" : "text-blue-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-foreground leading-tight">Razorpay</h3>
                        {razorpayActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Active</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Available</span>
                        )}
                      </div>

                      {razorpayActive && !showRzpForm ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Connected with Key ID ending in <span className="font-mono font-semibold text-foreground">...{(store?.razorpay_key_id ?? "").slice(-6)}</span>
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={openRzpForm}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg transition-colors">
                              <Pencil className="h-3.5 w-3.5" /> Update Keys
                            </button>
                            <button onClick={handleRemoveRzp} disabled={savingRzp}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                              {savingRzp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                              Disconnect
                            </button>
                          </div>
                        </div>
                      ) : !showRzpForm ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Use your own Razorpay account — collect payments directly. UPI, cards, netbanking and wallets.
                          </p>
                          <button onClick={openRzpForm}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                            <CreditCard className="h-3.5 w-3.5" /> Connect Razorpay
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Razorpay key entry form */}
                {showRzpForm && (
                  <div className="border-t bg-muted/30 px-5 py-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Enter Razorpay API Keys</p>
                      <button onClick={() => setShowRzpForm(false)}
                        className="text-xs text-muted-foreground hover:text-foreground underline">Cancel</button>
                    </div>

                    {/* Step guide */}
                    <div className="space-y-3">

                      {/* No account yet banner */}
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 flex items-start gap-2">
                        <span className="text-base leading-none mt-0.5">💡</span>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                          No Razorpay account yet?{" "}
                          <a href="https://dashboard.razorpay.com/signup" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">
                            Create a free account at razorpay.com
                          </a>{" "}
                          — registration takes about 5 minutes.
                        </p>
                      </div>

                      {/* Step-by-step */}
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 space-y-4">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-200 tracking-wide uppercase">How to connect Razorpay — step by step</p>

                        {/* Step 1 */}
                        <div className="flex gap-3 items-start">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                          <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed space-y-0.5">
                            <p className="font-semibold">Sign up or log in to Razorpay</p>
                            <p>Go to{" "}
                              <a href="https://dashboard.razorpay.com/signup" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">razorpay.com/signup</a>
                              {" "}and create your merchant account. Use your business email and verify it.
                            </p>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-3 items-start">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                          <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed space-y-0.5">
                            <p className="font-semibold">Open Settings → API Keys</p>
                            <p>Once logged in, click{" "}
                              <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">
                                Settings → API Keys
                              </a>
                              {" "}in the left sidebar of your Razorpay dashboard.
                            </p>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-3 items-start">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
                          <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed space-y-1">
                            <p className="font-semibold">Generate your API keys</p>
                            <p>Click <strong>"Generate Test Key"</strong> to try payments with dummy money first, or <strong>"Generate Live Key"</strong> to start collecting real payments.</p>
                            <div className="flex gap-3 mt-1">
                              <span className="bg-blue-100 dark:bg-blue-900/50 rounded-lg px-2 py-1 text-[10px]">
                                Test: <span className="font-mono font-bold">rzp_test_...</span>
                              </span>
                              <span className="bg-green-100 dark:bg-green-900/50 rounded-lg px-2 py-1 text-[10px] text-green-800 dark:text-green-300">
                                Live: <span className="font-mono font-bold">rzp_live_...</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div className="flex gap-3 items-start">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">4</span>
                          <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed space-y-0.5">
                            <p className="font-semibold">Copy both keys from the popup</p>
                            <p>Razorpay shows a popup with your <strong>Key ID</strong> and <strong>Key Secret</strong>. Copy them both immediately.</p>
                            <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 mt-1">⚠ The Key Secret is shown only once. If you close the popup without saving it, you will need to generate new keys.</p>
                          </div>
                        </div>

                        {/* Step 5 */}
                        <div className="flex gap-3 items-start">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">5</span>
                          <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed space-y-0.5">
                            <p className="font-semibold">Paste below and activate</p>
                            <p>Enter your Key ID and Key Secret in the fields below, then click <strong>Activate Razorpay</strong>. Customers can immediately pay via UPI, debit/credit cards, netbanking, and wallets — money goes directly to your Razorpay account.</p>
                          </div>
                        </div>
                      </div>

                      {/* KYC + payout reminder */}
                      <div className="bg-muted/50 border rounded-xl px-3 py-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-base leading-none mt-0.5">🏦</span>
                          <div className="text-[11px] text-muted-foreground leading-relaxed">
                            <p className="font-semibold text-foreground">Complete KYC to receive payouts</p>
                            <p>Go to <strong>Razorpay Dashboard → Account &amp; Settings → Business Info</strong> and submit your PAN, GST (if applicable), and bank account details. KYC approval takes 1–2 business days. Until then, payments are collected but held in your Razorpay balance.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-base leading-none mt-0.5">✅</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Once KYC is approved, Razorpay automatically settles payments to your bank account every business day (T+2 settlement cycle).
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-base leading-none mt-0.5">💸</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground">Transaction fee:</span> Razorpay charges <strong>2% per transaction</strong> (+ GST). This is deducted automatically before the amount is settled to your bank — you receive the rest.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Key ID *</label>
                      <Input
                        value={rzpKeyId}
                        onChange={e => setRzpKeyId(e.target.value)}
                        placeholder="rzp_test_xxxxxxxxxxxx or rzp_live_xxxxxxxxxxxx"
                        className="h-10 rounded-xl font-mono text-sm bg-background"
                        autoCorrect="off"
                        autoCapitalize="none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Key Secret {razorpayActive ? "(leave blank to keep existing)" : "*"}
                      </label>
                      <div className="relative">
                        <Input
                          value={rzpSecret}
                          onChange={e => setRzpSecret(e.target.value)}
                          type={showRzpSecret ? "text" : "password"}
                          placeholder={razorpayActive ? "Leave blank to keep existing secret" : "Paste your key secret here"}
                          className="h-10 rounded-xl pr-10 font-mono text-sm bg-background"
                          autoCorrect="off"
                          autoCapitalize="none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRzpSecret(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Your secret key is stored securely and never shown to customers.</p>
                    </div>

                    <Button
                      onClick={handleSaveRzp}
                      disabled={savingRzp}
                      className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                    >
                      {savingRzp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {savingRzp ? "Saving..." : razorpayActive ? "Update Keys" : "Activate Razorpay"}
                    </Button>
                  </div>
                )}
              </div>

              {/* ── Option 2: Advize Payment ── */}
              <div className="p-5">
                <div className="flex gap-4 items-start">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${advizeEnabled ? "bg-green-50 dark:bg-green-950/40" : "bg-primary/10"}`}>
                    <Zap className={`h-6 w-6 ${advizeEnabled ? "text-green-600 dark:text-green-400" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-foreground leading-tight">Advize Payment</h3>
                      {advizeEnabled ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Active</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">No API keys needed</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Accept UPI, cards &amp; wallets with Advize's built-in payment solution. No Razorpay account needed.
                    </p>
                    <button
                      onClick={handleToggleAdvize}
                      disabled={savingAdvize}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${
                        advizeEnabled
                          ? "bg-muted text-muted-foreground hover:bg-muted/80"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      }`}
                    >
                      {savingAdvize
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : advizeEnabled
                          ? "Disable"
                          : <><Zap className="h-3.5 w-3.5" /> Enable</>
                      }
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── Instagram DM Automation — Coming Soon ── */}
        <div className="relative pointer-events-none select-none">
          <div className="opacity-50">
            <InstagramPlugin store={store} onStoreChange={onStoreChange} />
          </div>
          <div className="absolute inset-0 flex items-start justify-end p-4">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300">
              Coming Soon
            </span>
          </div>
        </div>

        {/* ── WhatsApp Marketing — Coming Soon ── */}
        <div className="relative pointer-events-none select-none">
          <div className="opacity-50">
            <WhatsAppMarketingPlugin store={store} onStoreChange={onStoreChange} />
          </div>
          <div className="absolute inset-0 flex items-start justify-end p-4">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
              Coming Soon
            </span>
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

        {/* ── Print on Demand ── */}
        <div className="bg-card border rounded-2xl p-5 flex gap-4 items-start shadow-sm opacity-75">
          <div className="bg-pink-50 dark:bg-pink-950/40 p-3 rounded-xl flex-shrink-0">
            <Printer className="h-6 w-6 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold text-foreground leading-tight">Print on Demand Products</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sell custom-printed t-shirts, mugs, hoodies & more — products are printed and shipped only when an order is placed, so you carry zero inventory.
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>

        {/* ── Delivery Partners ── */}
        <button
          type="button"
          onClick={() => setLocation("/delivery")}
          className="w-full bg-card border rounded-2xl p-5 flex gap-4 items-start shadow-sm hover:border-primary/50 hover:shadow-md transition-all text-left">
          <div className="bg-green-50 dark:bg-green-950/40 p-3 rounded-xl flex-shrink-0">
            <Bike className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold text-foreground leading-tight">Delivery Partners</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                New
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect Shiprocket to offer fast local and national delivery to your customers.
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>

      </div>

    </div>
  );
}

/* ── Settings Panel ──────────────────────────────────── */
function SettingsRow({
  icon, label, description, right, onClick, danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-colors text-left
        ${onClick ? "hover:bg-muted/60 active:bg-muted cursor-pointer" : "cursor-default"}
        ${danger ? "text-destructive" : ""}`}
    >
      <div className={`shrink-0 ${danger ? "text-destructive" : "text-muted-foreground"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${danger ? "text-destructive" : "text-foreground"}`}>
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      {right !== undefined ? (
        <div className="shrink-0">{right}</div>
      ) : onClick ? (
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      ) : null}
    </button>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-2">
        {title}
      </p>
      <div className="bg-card border rounded-2xl overflow-hidden divide-y">
        {children}
      </div>
    </div>
  );
}

function SettingsPanel({
  store,
  onTabChange,
  onEditStore,
}: {
  store: StoreType | null;
  onTabChange: (index: number) => void;
  onEditStore: () => void;
}) {
  const { dark, toggle: toggleDark } = useTheme();
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [whatsappNotif, setWhatsappNotif] = useState<boolean>(() => {
    try { return localStorage.getItem("notif_whatsapp") !== "false"; } catch { return true; }
  });
  const [orderEmailNotif, setOrderEmailNotif] = useState<boolean>(() => {
    try { return localStorage.getItem("notif_order_email") === "true"; } catch { return false; }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleWhatsappNotif = (val: boolean) => {
    setWhatsappNotif(val);
    localStorage.setItem("notif_whatsapp", val ? "true" : "false");
  };
  const handleOrderEmailNotif = (val: boolean) => {
    setOrderEmailNotif(val);
    localStorage.setItem("notif_order_email", val ? "true" : "false");
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  const initials = (user?.displayName ?? user?.email ?? "U")
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="bg-primary/10 p-1.5 rounded-xl">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-10">
          Manage your account and app preferences.
        </p>
      </div>

      {/* ── Account ── */}
      <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 mb-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-lg font-extrabold text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          {user?.displayName && (
            <p className="text-base font-bold text-foreground truncate">{user.displayName}</p>
          )}
          <p className="text-sm text-muted-foreground truncate">{user?.email ?? "—"}</p>
          {store && (
            <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
              store.advize.in/store/{store.slug}
            </p>
          )}
        </div>
      </div>

      {/* ── Store ── */}
      <SettingsSection title="Store">
        <SettingsRow
          icon={<Store className="h-4 w-4" />}
          label="Edit Store Profile"
          description="Name, logo, WhatsApp, location & more"
          onClick={onEditStore}
        />
        <SettingsRow
          icon={<ListOrdered className="h-4 w-4" />}
          label="Manage Listings"
          description="Add, edit or remove your products"
          onClick={() => onTabChange(2)}
        />
        <SettingsRow
          icon={<Puzzle className="h-4 w-4" />}
          label="Plugins & Integrations"
          description="Payments, delivery, print on demand"
          onClick={() => onTabChange(3)}
        />
      </SettingsSection>

      {/* ── Appearance ── */}
      <SettingsSection title="Appearance">
        <SettingsRow
          icon={dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          label={dark ? "Light Mode" : "Dark Mode"}
          description={dark ? "Switch to a bright theme" : "Switch to a dark theme"}
          right={
            <Switch
              checked={dark}
              onCheckedChange={toggleDark}
              onClick={e => e.stopPropagation()}
            />
          }
        />
        <SettingsRow
          icon={<Sparkles className="h-4 w-4" />}
          label="Theme Color"
          description="Custom accent colors — coming soon"
          right={
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Soon
            </span>
          }
        />
      </SettingsSection>

      {/* ── Notifications ── */}
      <SettingsSection title="Notifications">
        <SettingsRow
          icon={<Bell className="h-4 w-4" />}
          label="WhatsApp Order Alerts"
          description="Get notified when a customer places an order"
          right={
            <Switch
              checked={whatsappNotif}
              onCheckedChange={handleWhatsappNotif}
              onClick={e => e.stopPropagation()}
            />
          }
        />
        <SettingsRow
          icon={<Mail className="h-4 w-4" />}
          label="Email Order Summary"
          description="Daily summary of orders sent to your email"
          right={
            <Switch
              checked={orderEmailNotif}
              onCheckedChange={handleOrderEmailNotif}
              onClick={e => e.stopPropagation()}
            />
          }
        />
      </SettingsSection>

      {/* ── Privacy & Legal ── */}
      <SettingsSection title="Privacy & Legal">
        <SettingsRow
          icon={<Shield className="h-4 w-4" />}
          label="Privacy Policy"
          description="How we handle your data"
          onClick={() => window.open("/privacy", "_blank")}
        />
        <SettingsRow
          icon={<FileText className="h-4 w-4" />}
          label="Terms & Conditions"
          description="Platform rules and usage policies"
          onClick={() => window.open("/terms", "_blank")}
        />
      </SettingsSection>

      {/* ── Support ── */}
      <SettingsSection title="Support">
        <SettingsRow
          icon={<HelpCircle className="h-4 w-4" />}
          label="Help & FAQ"
          description="Common questions and how-tos"
          onClick={() => {
            toast({ title: "Help center coming soon!", description: "Reach us on WhatsApp for now." });
          }}
        />
        <SettingsRow
          icon={<Mail className="h-4 w-4" />}
          label="Contact Support"
          description="support@advize.in"
          onClick={() => window.open("mailto:support@advize.in")}
        />
      </SettingsSection>

      {/* ── About ── */}
      <SettingsSection title="About">
        <SettingsRow
          icon={<Store className="h-4 w-4" />}
          label="Advize Store Builder"
          description="Version 1.0.0 · store.advize.in"
          right={null}
        />
      </SettingsSection>

      {/* ── Account actions ── */}
      <SettingsSection title="Account">
        <SettingsRow
          icon={<LogOut className="h-4 w-4" />}
          label="Sign Out"
          description="Sign out of your account"
          onClick={handleSignOut}
        />
        {!showDeleteConfirm ? (
          <SettingsRow
            icon={<Trash2 className="h-4 w-4" />}
            label="Delete Account"
            description="Permanently remove your store and data"
            onClick={() => setShowDeleteConfirm(true)}
            danger
          />
        ) : (
          <div className="px-4 py-4 flex flex-col gap-2">
            <p className="text-sm text-destructive font-semibold">Are you sure?</p>
            <p className="text-xs text-muted-foreground">
              This will permanently delete your store and all products. This cannot be undone.
            </p>
            <div className="flex gap-2 mt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 rounded-full text-xs"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 rounded-full text-xs bg-destructive hover:bg-destructive/90 text-white border-transparent"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  toast({ title: "Coming soon", description: "Account deletion will be available soon. Contact support@advize.in for immediate requests." });
                }}
              >
                Delete Account
              </Button>
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}

/* ── Earnings / Payments panel ───────────────────────── */
function EarningsPanel({ store, orderStats, onStatusChange, onStoreChange }: {
  store: StoreType | null;
  orderStats: OrderStats | null;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onStoreChange: (s: StoreType) => void;
}) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [methodFilter, setMethodFilter] = useState<"all" | "razorpay" | "advize">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Payout modal state (Advize only)
  const [showPayout, setShowPayout] = useState(false);
  const [upiId, setUpiId] = useState(store?.upi_id ?? "");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const advizeEnabled  = !!(store?.advize_payment_enabled);
  const razorpayActive = !!(store?.razorpay_key_id);
  const anyPaymentActive = advizeEnabled || razorpayActive;

  const allOrders = orderStats?.orders ?? [];

  // Method-filtered orders
  const methodFiltered = methodFilter === "all"
    ? allOrders
    : allOrders.filter(o => (o.payment_method ?? "razorpay") === methodFilter);

  // Status-filtered orders
  const filtered = statusFilter === "all"
    ? methodFiltered
    : methodFiltered.filter(o => o.status === statusFilter);

  const advizeOrders  = allOrders.filter(o => o.payment_method === "advize");
  const razorpayOrders = allOrders.filter(o => (o.payment_method ?? "razorpay") === "razorpay");

  const totalRevenue = allOrders
    .filter(o => o.payment_status === "paid")
    .reduce((s, o) => s + (o.amount_paise ?? 0), 0) / 100;

  const advizeRevenue = advizeOrders
    .filter(o => o.payment_status === "paid")
    .reduce((s, o) => s + (o.amount_paise ?? 0), 0) / 100;

  const razorpayRevenue = razorpayOrders
    .filter(o => o.payment_status === "paid")
    .reduce((s, o) => s + (o.amount_paise ?? 0), 0) / 100;

  const STATUS_FILTERS = [
    { key: "all",              label: "All",              count: methodFiltered.length },
    { key: "pending",          label: "Pending",          count: methodFiltered.filter(o => o.status === "pending").length },
    { key: "confirmed",        label: "Confirmed",        count: methodFiltered.filter(o => o.status === "confirmed").length },
    { key: "packed",           label: "Packed",           count: methodFiltered.filter(o => o.status === "packed").length },
    { key: "out_for_delivery", label: "Delivery",         count: methodFiltered.filter(o => o.status === "out_for_delivery").length },
    { key: "delivered",        label: "Delivered",        count: methodFiltered.filter(o => o.status === "delivered").length },
    { key: "cancelled",        label: "Cancelled",        count: methodFiltered.filter(o => o.status === "cancelled").length },
  ] as const;

  const handlePayoutOpen = async () => {
    setUpiId(store?.upi_id ?? "");
    setShowPayout(true);
    if (!store?.id) return;
    setHistoryLoading(true);
    try {
      const data = await getPayoutRequests(store.id);
      setPayoutHistory(data.requests);
    } catch {
      setPayoutHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePayoutSubmit = async () => {
    if (!store) return;
    const trimmed = upiId.trim();
    if (!trimmed) { toast({ variant: "destructive", title: "Please enter your UPI ID" }); return; }
    if (advizeRevenue <= 0) { toast({ variant: "destructive", title: "No Advize earnings to withdraw" }); return; }
    setPayoutLoading(true);
    try {
      await requestPayout({ store_id: store.id, upi_id: trimmed, amount_requested: advizeRevenue });
      const updated = await updateStore(store.id, { upi_id: trimmed });
      onStoreChange(updated);
      toast({ title: "Payout request submitted!", description: `₹${advizeRevenue.toLocaleString("en-IN")} will be sent to ${trimmed}` });
      const data = await getPayoutRequests(store.id);
      setPayoutHistory(data.requests);
      setShowPayout(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Request failed", description: err.message ?? "Please try again." });
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus as OrderStatus);
      onStatusChange(orderId, newStatus as OrderStatus);
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (ts: any): string => {
    if (!ts) return "–";
    const d = ts?.toDate ? ts.toDate() : new Date(ts?.seconds ? ts.seconds * 1000 : ts);
    if (isNaN(d.getTime())) return "–";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const STATUS_COLORS: Record<string, string> = {
    pending:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    confirmed:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    packed:           "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    out_for_delivery: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    delivered:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const STATUS_LABELS: Record<string, string> = {
    pending:          "📦 Pending",
    confirmed:        "✅ Confirmed",
    packed:           "🎁 Packed",
    out_for_delivery: "🚚 Out for Delivery",
    delivered:        "🏠 Delivered",
    cancelled:        "❌ Cancelled",
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Earnings</h1>
          <p className="text-muted-foreground text-xs mt-0.5">All paid orders across payment methods</p>
        </div>
        {advizeEnabled && (
          <Button size="sm" className="rounded-xl gap-1.5 font-semibold" onClick={handlePayoutOpen}>
            <IndianRupee className="h-3.5 w-3.5" />
            Withdraw
          </Button>
        )}
      </div>

      {!anyPaymentActive ? (
        /* No payment gateway configured yet */
        <div className="bg-card border rounded-2xl p-8 flex flex-col items-center text-center gap-3">
          <div className="bg-primary/10 p-4 rounded-2xl">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">No payment gateway active</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Connect Razorpay or enable Advize Payment in the Plugins tab to start accepting payments and track earnings here.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Revenue summary cards ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total revenue — full width */}
            <div className="bg-card border rounded-2xl p-4 shadow-sm col-span-2">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <IndianRupee className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">Total Revenue</span>
              </div>
              <p className="text-3xl font-extrabold text-foreground">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </p>
              {/* Per-method breakdown */}
              {razorpayActive && advizeEnabled && (
                <div className="flex gap-4 mt-2 pt-2 border-t">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[11px] text-muted-foreground">Razorpay</span>
                    <span className="text-[11px] font-bold text-foreground">₹{razorpayRevenue.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[11px] text-muted-foreground">Advize</span>
                    <span className="text-[11px] font-bold text-foreground">₹{advizeRevenue.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">Total Orders</span>
              </div>
              <p className="text-2xl font-extrabold text-foreground">{allOrders.length}</p>
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">Pending</span>
              </div>
              <p className="text-2xl font-extrabold text-amber-500">
                {allOrders.filter(o => o.status === "pending").length}
              </p>
            </div>
          </div>

          {/* ── Payment method filter (only if both are active) ── */}
          {razorpayActive && advizeEnabled && (
            <div className="flex gap-2">
              {(["all", "razorpay", "advize"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMethodFilter(m); setStatusFilter("all"); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    methodFilter === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {m === "all" ? "All" : m === "razorpay" ? "Razorpay" : "Advize"}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    methodFilter === m ? "bg-white/20 text-white" : "bg-background text-foreground"
                  }`}>
                    {m === "all" ? allOrders.length : m === "razorpay" ? razorpayOrders.length : advizeOrders.length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Status filter tabs ── */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {STATUS_FILTERS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  statusFilter === tab.key ? "bg-white/20 text-white" : "bg-background text-foreground"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ── Orders list ── */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ShoppingCart className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">No orders yet</p>
              <p className="text-xs opacity-60">
                {statusFilter === "all" ? "Paid orders will appear here." : `No ${statusFilter} orders.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(order => (
                <div key={order.id} className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">

                  {/* Order meta */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                      #{order.id.slice(0, 12).toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                    {/* Payment method badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${
                      (order.payment_method ?? "razorpay") === "razorpay"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {(order.payment_method ?? "razorpay") === "razorpay" ? "Razorpay" : "Advize"}
                    </span>
                  </div>

                  {/* Amount + payment status */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-2xl font-extrabold text-foreground">
                      ₹{Math.round((order.amount_paise ?? 0) / 100).toLocaleString("en-IN")}
                    </p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      order.payment_status === "paid"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : order.payment_status === "failed"
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                      {order.payment_status === "paid" ? "Paid" : order.payment_status === "failed" ? "Failed" : "Pending"}
                    </span>
                  </div>

                  {/* Customer info */}
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">{order.buyer?.name ?? "–"}</p>
                    {order.buyer?.phone && (
                      <p className="text-sm text-muted-foreground">+91 {order.buyer.phone}</p>
                    )}
                  </div>

                  {/* Items */}
                  <div className="bg-muted/40 rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Items</p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {order.items?.map(i => `${i.name} \u00d7${i.quantity}`).join(" \u00b7 ") ?? "–"}
                    </p>
                  </div>

                  {/* Delivery address */}
                  {order.buyer?.addressLine && (
                    <div className="bg-muted/40 rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Delivery Address</p>
                      <p className="text-sm text-foreground leading-relaxed break-words">{order.buyer.addressLine}</p>
                      <p className="text-sm text-foreground">
                        {order.buyer.city}{order.buyer.pincode ? ` \u2013 ${order.buyer.pincode}` : ""}
                      </p>
                    </div>
                  )}

                  {/* Fulfillment status */}
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground font-medium">Fulfillment Status</p>
                      {updatingId === order.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] ?? ""}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-muted/50 border border-border outline-none cursor-pointer transition-colors mt-1"
                    >
                      <option value="pending">📦 Pending</option>
                      <option value="confirmed">✅ Confirmed</option>
                      <option value="packed">🎁 Packed</option>
                      <option value="out_for_delivery">🚚 Out for Delivery</option>
                      <option value="delivered">🏠 Delivered</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Payout Sheet ── */}
      <Sheet open={showPayout} onOpenChange={setShowPayout}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90dvh] overflow-y-auto">
          <SheetTitle className="text-lg font-bold mb-1">Request Payout</SheetTitle>
          <p className="text-sm text-muted-foreground mb-5">Enter your UPI ID to withdraw your earnings. Your ID will be saved to your profile.</p>

          {/* Amount available */}
          <div className="bg-primary/10 rounded-2xl p-4 mb-5 text-center">
            <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide mb-1">Amount to Withdraw</p>
            <p className="text-4xl font-extrabold text-primary">₹{advizeRevenue.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground mt-1">Total collected via Advize Payment</p>
          </div>

          {/* UPI ID input */}
          <div className="space-y-2 mb-5">
            <label className="text-sm font-semibold">Your UPI ID</label>
            <Input
              placeholder="yourname@upi or yourname@okicici"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              className="h-12 rounded-xl text-base"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="text-xs text-muted-foreground">Example: gaurav@okaxis, 9876543210@upi</p>
          </div>

          <Button
            className="w-full h-12 rounded-2xl text-base font-bold gap-2"
            onClick={handlePayoutSubmit}
            disabled={payoutLoading || advizeRevenue <= 0}
          >
            {payoutLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <IndianRupee className="h-5 w-5" />}
            {payoutLoading ? "Submitting..." : `Withdraw ₹${advizeRevenue.toLocaleString("en-IN")}`}
          </Button>

          {advizeRevenue <= 0 && (
            <p className="text-center text-xs text-muted-foreground mt-2">No earnings available to withdraw yet.</p>
          )}

          {/* Payout history */}
          <div className="mt-8">
            <p className="text-sm font-bold mb-3">Past Requests</p>
            {historyLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : payoutHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No payout requests yet.</p>
            ) : (
              <div className="space-y-2">
                {payoutHistory.map(p => {
                  const d = p.created_at?.seconds
                    ? new Date(p.created_at.seconds * 1000)
                    : new Date(p.created_at ?? Date.now());
                  const dateStr = isNaN(d.getTime()) ? "–" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <div key={p.id} className="bg-card border rounded-2xl p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">₹{p.amount_requested.toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.upi_id}</p>
                        <p className="text-xs text-muted-foreground">{dateStr}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        p.status === "processed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : p.status === "rejected"  ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {p.status === "processed" ? "✓ Paid" : p.status === "rejected" ? "✗ Rejected" : "⏳ Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── main layout ─────────────────────────────────────── */
const TABS = [
  { label: "Home",       icon: LayoutDashboard },
  { label: "My Store",   icon: Store           },
  { label: "Listings",   icon: ListOrdered     },
  { label: "Plugins",    icon: Puzzle          },
  { label: "Earnings",   icon: IndianRupee     },
] as const;

export function DashboardPage() {
  const search = useSearch();
  const initialTab = Math.min(parseInt(new URLSearchParams(search).get("tab") ?? "0") || 0, TABS.length - 1);
  const [active, setActive] = useState(initialTab);
  const prevActive = useRef(initialTab);
  const touchStartX = useRef<number | null>(null);
  const panelScrollTops = useRef<number[]>([0, 0, 0, 0, 0]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  const [showSettings, setShowSettings] = useState(false);
  const handleLoyaltyClick = () => { setLocation("/loyalty"); };
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
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
  const [storeEditTrigger, setStoreEditTrigger] = useState(0);

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
    // order stats fetched independently so any failure doesn't break products
    getOrderStats(storeId).then(setOrderStats).catch(() => {});
  }, []);

  const handleOrderStatusChange = useCallback((orderId: string, newStatus: OrderStatus) => {
    setOrderStats(prev => {
      if (!prev) return prev;
      const update = (o: Order) => o.id === orderId ? { ...o, status: newStatus } : o;
      const updatedOrders = prev.orders.map(update);
      return {
        ...prev,
        orders: updatedOrders,
        recentOrders: prev.recentOrders.map(update),
        pendingOrders:   updatedOrders.filter(o => o.status === "pending").length,
        confirmedOrders: updatedOrders.filter(o => o.status === "confirmed").length,
        deliveredOrders: updatedOrders.filter(o => o.status === "delivered").length,
        cancelledOrders: updatedOrders.filter(o => o.status === "cancelled").length,
      };
    });
  }, []);

  useEffect(() => {
    if (store?.id) {
      loadData(store.id);
    }
  }, [store?.id, loadData]);

  // Show Earnings tab when any payment gateway is active
  const advizeEnabled  = !!(store?.advize_payment_enabled);
  const razorpayActive = !!(store?.razorpay_key_id);
  const earningsVisible = advizeEnabled || razorpayActive;
  const visibleTabs = TABS.filter((_, i) => i !== 4 || earningsVisible);

  useEffect(() => {
    if (!earningsVisible && active === 4) setActive(0);
  }, [earningsVisible, active]);

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
    if (delta > 0) setActive(p => Math.min(p + 1, visibleTabs.length > 0 ? TABS.indexOf(visibleTabs[visibleTabs.length - 1]) : TABS.length - 1));
    else           setActive(p => Math.max(p - 1, 0));
    touchStartX.current = null;
  };

  const isLoading = storeLoading && !store;

  return (
    <div className="h-[100dvh] flex flex-col bg-muted/10 overflow-hidden">

      {/* ── Settings Sheet ─────────────────────────────────── */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
          <SheetTitle className="sr-only">Settings</SheetTitle>
          <SettingsPanel
            store={store}
            onTabChange={(i) => { setShowSettings(false); setActive(i); }}
            onEditStore={() => { setShowSettings(false); setActive(1); setStoreEditTrigger(t => t + 1); }}
          />
        </SheetContent>
      </Sheet>

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-5xl mx-auto flex h-14 items-center justify-between px-4">

          {/* Logo — opens dropdown with Settings / Dark Mode / Sign Out */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl hover:bg-muted/60 px-1 py-1 transition-colors -ml-1 outline-none">
              <div className="bg-primary/10 p-1.5 rounded-xl overflow-hidden w-7 h-7 flex items-center justify-center shrink-0">
                {store?.logo_url
                  ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                  : <Store className="h-4 w-4 text-primary" />}
              </div>
              <span className="text-base font-bold text-foreground">
                {store?.name ?? "My Shop"}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => setShowSettings(true)} className="gap-2.5">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleDark} className="gap-2.5">
                {dark
                  ? <Sun className="h-4 w-4 text-amber-400" />
                  : <Moon className="h-4 w-4 text-muted-foreground" />}
                {dark ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="gap-2.5 text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search input — tablet + desktop */}
          <div className="hidden sm:flex flex-1 max-w-xs mx-3 lg:max-w-sm relative items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setActive(2); }}
              placeholder="Search products..."
              className="w-full h-9 pl-9 pr-8 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Tablet tab pills (sm → lg) */}
          <div className="hidden sm:flex lg:hidden items-center gap-1 bg-muted rounded-full p-1 shrink-0">
            {visibleTabs.map((tab) => {
              const i = TABS.indexOf(tab);
              return (
                <button
                  key={tab.label}
                  onClick={() => setActive(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    active === i
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile: search icon toggle */}
          <button
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
            onClick={() => setShowMobileSearch(p => !p)}
            aria-label="Search"
          >
            {showMobileSearch
              ? <X className="h-4 w-4 text-muted-foreground" />
              : <Search className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Mobile search bar */}
        {showMobileSearch && (
          <div className="sm:hidden px-4 pb-2.5 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setActive(2); }}
                placeholder="Search products..."
                className="w-full h-9 pl-9 pr-8 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile dot nav */}
        {!showMobileSearch && (
          <div className="flex sm:hidden justify-center gap-1.5 pb-2">
            {visibleTabs.map((_, idx) => {
              const i = TABS.indexOf(visibleTabs[idx]);
              return (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`rounded-full transition-all duration-300 ${
                    active === i ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/30"
                  }`}
                />
              );
            })}
          </div>
        )}
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
              {visibleTabs.map((tab) => {
                const i = TABS.indexOf(tab);
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
                <HomePanel products={products} analytics={analytics} store={store} orderStats={orderStats} loading={dataLoading} onLoyaltyClick={handleLoyaltyClick} />
              </div>
              <div ref={el => { panelRefs.current[1] = el; }} className="w-full flex-shrink-0 h-full overflow-y-auto">
                <MyStorePanel
                  store={store}
                  products={products}
                  onLogoChange={(url) => setStore(prev => prev ? { ...prev, logo_url: url } : prev)}
                  onStoreChange={(updated) => setStore(updated)}
                  editTrigger={storeEditTrigger}
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
                  searchQuery={searchQuery}
                  loading={dataLoading}
                />
              </div>
              <div ref={el => { panelRefs.current[3] = el; }} className="w-full flex-shrink-0 h-full overflow-y-auto">
                <PluginsPanel store={store} onStoreChange={(updated) => setStore(updated)} />
              </div>
              <div ref={el => { panelRefs.current[4] = el; }} className="w-full flex-shrink-0 h-full overflow-y-auto">
                <EarningsPanel store={store} orderStats={orderStats} onStatusChange={handleOrderStatusChange} onStoreChange={(updated) => setStore(updated)} />
              </div>
            </div>
          </div>

          {/* ── Desktop: active panel (no carousel) ────────────── */}
          <div className="hidden lg:flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {active === 0 && <HomePanel products={products} analytics={analytics} store={store} orderStats={orderStats} loading={dataLoading} onLoyaltyClick={handleLoyaltyClick} />}
              {active === 1 && (
                <MyStorePanel
                  store={store}
                  products={products}
                  onLogoChange={(url) => setStore(prev => prev ? { ...prev, logo_url: url } : prev)}
                  onStoreChange={(updated) => setStore(updated)}
                  editTrigger={storeEditTrigger}
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
                  searchQuery={searchQuery}
                  loading={dataLoading}
                />
              )}
              {active === 3 && <PluginsPanel store={store} onStoreChange={(updated) => setStore(updated)} />}
              {active === 4 && <EarningsPanel store={store} orderStats={orderStats} onStatusChange={handleOrderStatusChange} onStoreChange={(updated) => setStore(updated)} />}
            </div>
          </div>

        </div>
      )}

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t">
        <div className="flex">
          {visibleTabs.map((tab) => {
            const i = TABS.indexOf(tab);
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
