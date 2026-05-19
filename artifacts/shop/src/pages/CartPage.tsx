import { useState, useEffect } from "react";
import { useParams, useSearch, Link } from "wouter";
import {
  ArrowLeft, ShoppingCart, Trash2, Plus, Minus,
  MessageCircle, Store, CreditCard, MapPin,
  User, Phone, CheckCircle2, Loader2, Truck, Gift, Tag, X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/contexts/CartContext";
import type { CartItem } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { getStore, createRazorpayOrder, verifyRazorpayPayment, createOrder, createAdvizeOrder, getLoyaltyCard, redeemLoyalty, validateCoupon, getCoupons } from "@/lib/api";
import type { Store as StoreType, LoyaltyCard, CouponValidation, Coupon } from "@/lib/api";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

type Screen = "cart" | "checkout" | "success";

interface BuyerInfo {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

function itemPrice(item: CartItem) {
  if (item.mixData) return item.mixData.selectedTier.price * item.quantity;
  const p = item.product;
  const unit = (p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price)
    ? p.salePrice : p.price;
  return unit * item.quantity;
}

function unitPrice(item: CartItem) {
  if (item.mixData) return item.mixData.selectedTier.price;
  const p = item.product;
  return (p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price)
    ? p.salePrice : p.price;
}

export function CartPage({ forcedSlug }: { forcedSlug?: string } = {}) {
  const params = useParams();
  const slug = forcedSlug ?? params.slug ?? "";
  const onSubdomain = !!forcedSlug;
  const { items, updateQty, removeItem, clearCart, totalItems, totalPrice } = useCart();
  const { toast } = useToast();
  const [store, setStore] = useState<StoreType | null>(null);
  const [screen, setScreen] = useState<Screen>("cart");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [buyer, setBuyer] = useState<BuyerInfo>({
    name: "", phone: "", addressLine: "", city: "", state: "", pincode: "",
  });
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [loyaltyRedeeming, setLoyaltyRedeeming] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<CouponValidation | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  /* Always dark on storefront pages */
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("dark");
    return () => {};
  }, []);

  /* Load store info + available coupons */
  useEffect(() => {
    if (!slug) return;
    getStore(slug).then(s => {
      setStore(s);
      if (s?.id) getCoupons(s.id).then(setAvailableCoupons).catch(() => {});
    }).catch(() => {});
  }, [slug]);

  /* Fetch loyalty card after successful payment */
  useEffect(() => {
    if (screen !== "success" || !store?.id || !buyer?.phone) return;
    getLoyaltyCard(store.id, buyer.phone).then(setLoyaltyCard).catch(() => {});
  }, [screen, store?.id, buyer.phone]);

  const handleRedeemLoyalty = async () => {
    if (!store?.id || !buyer?.phone) return;
    setLoyaltyRedeeming(true);
    try {
      await redeemLoyalty(store.id, buyer.phone);
      const updated = await getLoyaltyCard(store.id, buyer.phone);
      setLoyaltyCard(updated);
      toast({ title: "Reward claimed! 🎉", description: "Show this screen to the seller to claim your reward." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not redeem", description: err.message });
    } finally { setLoyaltyRedeeming(false); }
  };

  /* Inject Razorpay script once */
  useEffect(() => {
    if (document.getElementById("rzp-script")) return;
    const s = document.createElement("script");
    s.id = "rzp-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);


  const hasRazorpay = !!(store?.razorpay_account_id || store?.razorpay_key_id);
  const hasAdvize   = !!(store?.advize_payment_enabled);
  const hasPayment  = hasAdvize || hasRazorpay;
  const deliveryCharge = store?.delivery_charge ?? 0;
  const couponDiscount = couponData?.valid ? (couponData.discount_rupees ?? 0) : 0;
  const grandTotal = Math.floor(Math.max(0, totalPrice + deliveryCharge - couponDiscount));

  /* ── WhatsApp order (no payment) ── */
  const handleWhatsAppOrder = (extraInfo?: string) => {
    if (!store?.whatsapp) return;
    const lines = items.map(item => {
      if (item.mixData) {
        const comp = item.mixData.composition.map(c => `${c.option} \u00d7${c.qty}`).join(", ");
        return `\u2022 ${item.product.name} \u00d7${item.quantity} pack${item.quantity !== 1 ? "s" : ""} (Pack of ${item.mixData.selectedTier.quantity}) \u2014 \u20b9${itemPrice(item).toLocaleString("en-IN")}\n  Mix: ${comp}`;
      }
      return `\u2022 ${item.product.name} \u00d7 ${item.quantity} \u2014 \u20b9${itemPrice(item).toLocaleString("en-IN")}`;
    });
    const info = extraInfo ?? "";
    const deliveryLine = deliveryCharge > 0
      ? `\n🚚 Delivery: ₹${deliveryCharge.toLocaleString("en-IN")}`
      : "\n🚚 Delivery: Free";
    const message = `Hello 👋,\n\nI'd like to order the following:\n\n${lines.join("\n")}\n\n🛒 Subtotal: ₹${totalPrice.toLocaleString("en-IN")}${deliveryLine}\n💰 Total: ₹${grandTotal.toLocaleString("en-IN")}${info}\n\nPlease confirm availability and delivery details. Thank you!`;
    const number = store.whatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
  };

  /* ── Validate checkout form ── */
  const validateBuyer = () => {
    if (!buyer.name.trim()) { toast({ variant: "destructive", title: "Please enter your name." }); return false; }
    if (!/^\d{10}$/.test(buyer.phone.replace(/\s/g, ""))) {
      toast({ variant: "destructive", title: "Please enter a valid 10-digit phone number." }); return false;
    }
    if (!buyer.addressLine.trim()) { toast({ variant: "destructive", title: "Please enter your address." }); return false; }
    if (!buyer.city.trim()) { toast({ variant: "destructive", title: "Please enter your city." }); return false; }
    if (!buyer.state.trim()) { toast({ variant: "destructive", title: "Please enter your state." }); return false; }
    if (!/^\d{6}$/.test(buyer.pincode.trim())) {
      toast({ variant: "destructive", title: "Please enter a valid 6-digit pincode." }); return false;
    }
    return true;
  };

  const handleApplyCoupon = async (overrideCode?: string) => {
    const code = (overrideCode ?? couponCode).trim();
    if (!code || !store?.id) return;
    if (overrideCode) setCouponCode(overrideCode);
    setCouponApplying(true);
    try {
      const result = await validateCoupon(store.id, code, Math.round(totalPrice * 100));
      setCouponData(result);
      if (result.valid) {
        toast({ title: `Coupon applied!`, description: result.description || `${result.type === "percent" ? result.value + "%" : "₹" + result.value} off your order.` });
      } else {
        toast({ variant: "destructive", title: "Invalid coupon", description: result.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not apply coupon", description: err.message });
    } finally { setCouponApplying(false); }
  };

  const handleRemoveCoupon = () => { setCouponCode(""); setCouponData(null); };

  /* ── Advize checkout — saves request to DB, no gateway call ── */
  const handleAdvizeCheckout = async () => {
    if (!validateBuyer() || !store) return;
    setPaymentLoading(true);
    try {
      await createAdvizeOrder({
        store_id: store.id,
        amount_paise: Math.round(grandTotal * 100),
        items: items.map(i => ({
          productId: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          price: unitPrice(i),
          ...(i.mixData ? { mixData: i.mixData } : {}),
        })),
        buyer,
        slug,
      });
      localStorage.setItem("advize_customer_phone", buyer.phone.trim());
      clearCart();
      setScreen("success");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not place order", description: err.message ?? "Please try again." });
    } finally {
      setPaymentLoading(false);
    }
  };

  /* ── Razorpay checkout ── */
  const handleRazorpayCheckout = async () => {
    if (!validateBuyer() || !store) return;
    setPaymentLoading(true);
    try {
      const orderData = await createRazorpayOrder(
        store.id,
        Math.round(grandTotal * 100),
        `cart_${store.id}_${Date.now()}`
      );

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        toast({ variant: "destructive", title: "Payment not available", description: "Please refresh and try again." });
        setPaymentLoading(false);
        return;
      }

      const linesSummary = items.map(i => `${i.product.name} ×${i.quantity}`).join(", ");

      const options: any = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: store.name,
        description: linesSummary.slice(0, 80),
        order_id: orderData.order_id,
        prefill: {
          name: buyer.name,
          contact: `+91${buyer.phone.replace(/\D/g, "").slice(-10)}`,
        },
        config: {
          display: {
            preferences: { show_default_blocks: true },
          },
        },
        notes: {
          delivery_address: `${buyer.addressLine}, ${buyer.city}, ${buyer.state} - ${buyer.pincode}`,
          items: linesSummary,
        },
        theme: { color: "#16a34a" },
        handler: async (response: any) => {
          try {
            const result = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              store_id: store.id,
            });
            if (result.verified) {
              createOrder({
                store_id: store.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                amount_paise: Math.round(grandTotal * 100),
                items: items.map(i => ({
                  productId: i.product.id,
                  name: i.product.name,
                  quantity: i.quantity,
                  price: unitPrice(i),
                  ...(i.mixData ? { mixData: i.mixData } : {}),
                })),
                buyer,
              }).catch(() => {}); // fire-and-forget — don't block success screen
              localStorage.setItem("advize_customer_phone", buyer.phone.trim());
              setScreen("success");
              clearCart();
            } else {
              toast({ variant: "destructive", title: "Payment verification failed", description: "Contact the seller." });
            }
          } catch {
            toast({ variant: "destructive", title: "Could not verify payment", description: "Contact the seller with your payment ID." });
          }
          setPaymentLoading(false);
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
      };

      new Razorpay(options).open();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not initiate payment", description: err.message ?? "Please try again." });
      setPaymentLoading(false);
    }
  };

  /* ── Shared header ── */
  const Header = ({ title }: { title: string }) => (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground px-4">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
      <div className="h-14 flex items-center relative z-10">
        <button
          onClick={() => screen === "checkout" ? setScreen("cart") : window.history.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">{title}</span>
            {screen === "cart" && totalItems > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full leading-none">
                {totalItems}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  /* ── Empty state ── */
  if (items.length === 0 && screen !== "success") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Header title="My Cart" />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-muted/40 flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div>
            <p className="font-bold text-xl text-foreground">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1.5">Add products from the store to get started</p>
          </div>
          <Button asChild className="rounded-full px-6 mt-1">
            <Link href={onSubdomain ? "/" : `/store/${slug}`}>
              <Store className="h-4 w-4 mr-2" />
              Browse Products
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Success screen ── */
  if (screen === "success") {
    const stampsRequired = loyaltyCard?.stamps_required ?? 10;
    const stampsEarned   = loyaltyCard?.stamps ?? 0;
    const canRedeem      = loyaltyCard?.enabled && stampsEarned >= stampsRequired;

    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Header title="Order Placed" />
        <div className="flex-1 flex flex-col items-center gap-5 px-6 pt-10 pb-10 text-center">
          <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-bold text-2xl text-foreground">Payment Successful!</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Your order has been placed. The seller will contact you on <span className="font-semibold">{buyer.phone}</span> to confirm delivery.
            </p>
          </div>

          {/* ── Loyalty stamp card ── */}
          {loyaltyCard?.enabled && (
            <div className="w-full max-w-sm bg-card border rounded-2xl p-5 shadow-sm text-left">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm font-bold text-foreground">
                  {canRedeem ? "🎉 Reward Unlocked!" : "Loyalty Stamp Earned!"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                {canRedeem
                  ? <>You've earned your reward: <strong className="text-foreground">{loyaltyCard.reward}</strong></>
                  : <>Collect <strong className="text-foreground">{stampsRequired}</strong> stamps to unlock: <strong className="text-foreground">{loyaltyCard.reward}</strong></>
                }
              </p>

              {/* Stamp grid */}
              <div className="flex flex-wrap gap-2 mb-3">
                {Array.from({ length: stampsRequired }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-colors ${
                      i < stampsEarned
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-border bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    {i < stampsEarned ? "★" : ""}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                {stampsEarned} / {stampsRequired} stamps collected
                {(loyaltyCard.redeemed_count ?? 0) > 0 && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    · {loyaltyCard.redeemed_count} reward{loyaltyCard.redeemed_count !== 1 ? "s" : ""} redeemed
                  </span>
                )}
              </p>

              {canRedeem && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
                  <Gift className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    🎉 Reward unlocked! Show this screen to the store owner — they will confirm your reward: <strong>{loyaltyCard!.reward}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          <Button asChild className="rounded-full px-6">
            <Link href={onSubdomain ? "/" : `/store/${slug}`}>Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Checkout form (payment stores only) ── */
  if (screen === "checkout") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Header title="Delivery Details" />
        <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full pb-10 space-y-5">

          {/* Order mini-summary */}
          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Order Summary</p>
            {items.map(item => (
              <div key={item.product.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground truncate mr-2">{item.product.name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                <span className="font-semibold shrink-0">₹{itemPrice(item).toLocaleString("en-IN")}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2 mt-1 text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-semibold">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Delivery</span>
              {deliveryCharge > 0
                ? <span className="font-semibold">₹{deliveryCharge.toLocaleString("en-IN")}</span>
                : <span className="font-semibold text-green-600 dark:text-green-400">Free</span>
              }
            </div>
            {couponDiscount > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> {couponData?.code}</span>
                <span className="font-semibold">-₹{couponDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-2 mt-1">
              <span className="font-bold">Total</span>
              <span className="font-extrabold text-primary text-lg">₹{grandTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Promo Code */}
          <div className="bg-card border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Promo Code</p>
            </div>
            {couponData?.valid ? (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400 font-mono">{couponData.code}</p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {couponData.type === "percent" ? `${couponData.value}% off` : `₹${couponData.value} off`}
                    {couponData.description ? ` — ${couponData.description}` : ""}
                  </p>
                </div>
                <button onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-destructive ml-2 p-1">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code (e.g. SAVE10)"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    className="h-10 rounded-xl flex-1 font-mono"
                    onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponApplying || !couponCode.trim()}
                    className="h-10 rounded-xl px-4 shrink-0"
                  >
                    {couponApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
                {availableCoupons.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Available offers</p>
                    <div className="space-y-2">
                      {availableCoupons.map(c => (
                        <button
                          key={c.code}
                          onClick={() => handleApplyCoupon(c.code)}
                          disabled={couponApplying}
                          className="w-full flex items-center justify-between bg-muted/40 hover:bg-primary/5 border border-dashed border-muted-foreground/30 hover:border-primary/40 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-50 group"
                        >
                          <div className="min-w-0">
                            <span className="text-sm font-bold font-mono tracking-wide text-foreground group-hover:text-primary transition-colors">{c.code}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
                              {c.description ? ` · ${c.description}` : ""}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-primary ml-3 shrink-0">Apply</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Contact info */}
          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Contact Information</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buyer-name">Full Name</Label>
              <Input
                id="buyer-name"
                placeholder="Priya Sharma"
                value={buyer.name}
                onChange={e => setBuyer(b => ({ ...b, name: e.target.value }))}
                className="h-11 rounded-xl"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buyer-phone">Phone Number</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">+91</span>
                <Input
                  id="buyer-phone"
                  placeholder="9876543210"
                  value={buyer.phone}
                  onChange={e => setBuyer(b => ({ ...b, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  className="h-11 rounded-xl pl-12"
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Delivery Address</p>
              <span className="text-[10px] text-muted-foreground ml-auto">Required for shipping</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address-line">
                House / Flat No., Street, Area <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address-line"
                placeholder="e.g. Flat 4B, Rose Apartments, MG Road"
                value={buyer.addressLine}
                onChange={e => setBuyer(b => ({ ...b, addressLine: e.target.value }))}
                className="h-11 rounded-xl"
                autoComplete="street-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  placeholder="e.g. Mumbai"
                  value={buyer.city}
                  onChange={e => setBuyer(b => ({ ...b, city: e.target.value }))}
                  className="h-11 rounded-xl"
                  autoComplete="address-level2"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pincode">
                  Pincode <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pincode"
                  placeholder="6-digit pincode"
                  value={buyer.pincode}
                  onChange={e => setBuyer(b => ({ ...b, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                  className={`h-11 rounded-xl ${buyer.pincode.length > 0 && buyer.pincode.length !== 6 ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                />
                {buyer.pincode.length > 0 && buyer.pincode.length !== 6 && (
                  <p className="text-[10px] text-red-500">Must be 6 digits</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state">
                State <span className="text-red-500">*</span>
              </Label>
              <Select value={buyer.state} onValueChange={v => setBuyer(b => ({ ...b, state: v }))}>
                <SelectTrigger id="state" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pay button */}
          <Button
            className="w-full h-12 rounded-2xl text-base font-bold gap-2 shadow-md"
            onClick={hasAdvize ? handleAdvizeCheckout : handleRazorpayCheckout}
            disabled={paymentLoading}
          >
            {paymentLoading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <CreditCard className="h-5 w-5" />
            }
            {paymentLoading ? "Redirecting to payment..." : `Pay ₹${grandTotal.toLocaleString("en-IN")} Securely`}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Secured by Razorpay · 100% safe & encrypted
          </p>
        </main>
      </div>
    );
  }

  /* ── Cart screen ── */
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Header title="My Cart" />

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full pb-8">

        {/* Cart items */}
        <div className="space-y-3 mb-4">
          {items.map(item => {
            const unit = unitPrice(item);
            const isMix = !!item.mixData;
            return (
              <div key={item.product.id} className="bg-card border rounded-2xl p-3 flex gap-3 shadow-sm">
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-muted self-start"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{item.product.name}</p>
                  {isMix ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pack of {item.mixData!.selectedTier.quantity} &bull; &#8377;{unit.toLocaleString("en-IN")}/pack
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {item.mixData!.composition.map(c => `${c.option} \u00d7${c.qty}`).join(", ")}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-extrabold text-primary mt-0.5">&#8377;{unit.toLocaleString("en-IN")}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      className="w-7 h-7 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
                      onClick={() => updateQty(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                    <button
                      className="w-7 h-7 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
                      onClick={() => updateQty(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="ml-auto text-xs font-semibold text-muted-foreground shrink-0">
                      &#8377;{itemPrice(item).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <button
                  className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 text-muted-foreground self-start"
                  onClick={() => removeItem(item.product.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
            <span className="font-semibold">₹{totalPrice.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Delivery</span>
            {deliveryCharge > 0
              ? <span className="font-semibold">₹{deliveryCharge.toLocaleString("en-IN")}</span>
              : <span className="font-semibold text-green-600 dark:text-green-400">Free</span>
            }
          </div>
          <div className="flex items-center justify-between border-t pt-2">
            <span className="font-bold text-foreground">Total</span>
            <span className="font-extrabold text-primary text-xl">₹{grandTotal.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {hasPayment ? (
            /* Payment-enabled store: primary = Checkout, secondary = WhatsApp */
            <>
              <Button
                className="w-full h-12 rounded-2xl text-base font-bold gap-2 shadow-md"
                onClick={() => setScreen("checkout")}
              >
                <CreditCard className="h-5 w-5" />
                Proceed to Checkout
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 rounded-2xl text-sm font-semibold gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
                onClick={() => handleWhatsAppOrder()}
                disabled={!store?.whatsapp}
              >
                <MessageCircle className="h-4 w-4" />
                Order via WhatsApp instead
              </Button>
            </>
          ) : (
            /* No payment: WhatsApp only */
            <Button
              className="w-full h-12 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-base gap-2 shadow-md"
              onClick={() => handleWhatsAppOrder()}
              disabled={!store?.whatsapp}
            >
              <MessageCircle className="h-5 w-5 fill-white" />
              Order via WhatsApp
            </Button>
          )}

          <button
            className="w-full text-xs text-muted-foreground/50 text-center py-1 hover:text-red-400 transition-colors"
            onClick={clearCart}
          >
            Clear cart
          </button>
        </div>
      </main>
    </div>
  );
}
