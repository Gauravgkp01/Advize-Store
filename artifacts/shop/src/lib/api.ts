import { auth } from "@/lib/firebase";

export type ProductVariant = {
  label: string;
  values: string[];
};

export type PricingTier = {
  quantity: number;
  price: number;
};

export type MixMatchComposition = {
  option: string;
  qty: number;
};

export type MixCartData = {
  selectedTier: PricingTier;
  composition: MixMatchComposition[];
};

export type Product = {
  id: string;
  storeId: string;
  name: string;
  price: number;
  salePrice?: number;
  description: string;
  imageUrl: string;
  imageUrls: string[];
  category: string;
  units: number;
  trending?: boolean;
  variants?: ProductVariant[];
  productType?: "normal" | "mix_match" | "affiliate";
  affiliateUrl?: string;
  pricingTiers?: PricingTier[];
  mixOptions?: string[];
  mixInventory?: Record<string, number>;
  mixAttributeLabel?: string;
};

export type Review = {
  id: string;
  product_id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  image_url?: string;
};

const BASE = `${import.meta.env.BASE_URL}api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch {}
  }

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Domain helpers ──────────────────────────────────────────
/** Returns the store slug when the app is accessed via a store subdomain, e.g. myshop.store.advize.in */
export function getSubdomainSlug(): string | null {
  const m = window.location.hostname.match(/^([^.]+)\.store\.advize\.in$/);
  return m?.[1] ?? null;
}

/** Returns the public URL for a store — subdomain format in prod, path format in dev */
export function getStorePublicUrl(slug: string): string {
  if (import.meta.env.PROD) return `https://${slug}.store.advize.in`;
  return `${window.location.origin}/store/${slug}`;
}

// ── Stores ──────────────────────────────────────────────────
export interface Store {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  category?: string;
  location?: string;
  logo_url?: string;
  email?: string;
  contact_phone?: string;
  terms_and_conditions?: string;
  razorpay_key_id?: string;
  razorpay_enabled?: boolean;
  razorpay_account_id?: string;
  razorpay_account_status?: string;
  platform_razorpay_enabled?: boolean;
  advize_payment_enabled?: boolean;
  upi_id?: string;
  delivery_charge?: number;
  delivery_days_min?: number;
  delivery_days_max?: number;
  ig_user_id?: string;
  ig_username?: string;
  description?: string;
  about?: string;
  loyalty_enabled?: boolean;
  loyalty_stamps_required?: number;
  loyalty_reward?: string;
  wa_phone_number_id?: string;
  wa_business_phone?: string;
  wa_display_name?: string;
  wa_waba_id?: string;
  wa_connected_at?: number;
  total_withdrawn?: number;
  storefront_theme?: "dark" | "light";
  whatsapp_ordering_enabled?: boolean;
  owner_id?: string;
  banner_images?: string[];
}

export const getStore = (slug: string) =>
  request<Store>(`/stores/${slug}`);

// ── Combined storefront (store + products + reviews in one request) ───────────
export const getStorefront = (slug: string) =>
  request<{ store: Store; products: ApiProduct[]; reviews: ApiReview[] }>(
    `/storefront/${slug}`
  ).then(p => ({
    store: p.store,
    products: p.products.map(toProduct),
    reviews: p.reviews.map(toReview),
  }));

export const getStoreById = (id: string) =>
  request<Store>(`/stores/id/${id}`);

export const getStoreByOwnerId = (owner_id: string) =>
  request<Store>(`/stores?owner_id=${encodeURIComponent(owner_id)}`);

export const sendOtp = (email: string) =>
  request<{ message: string }>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const verifyOtp = (email: string, otp: string) =>
  request<{ verified: boolean }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });

export const createStore = (body: Omit<Store, "id">) =>
  request<Store>("/stores", { method: "POST", body: JSON.stringify(body) });

export const updateStore = (id: string, body: Partial<Omit<Store, "id">>) =>
  request<Store>(`/stores/${id}`, { method: "PATCH", body: JSON.stringify(body) });

// ── Products ─────────────────────────────────────────────────
export interface ApiProduct {
  id: string;
  store_id: string;
  name: string;
  price: number;
  sale_price?: number;
  description: string;
  image_url: string;
  image_urls?: string[];
  category: string;
  units: number;
  trending?: boolean;
  variants: { id: string; label: string; values: string[] }[];
  product_type?: "normal" | "mix_match" | "affiliate";
  affiliate_url?: string;
  pricing_tiers?: PricingTier[];
  mix_options?: string[];
  mix_inventory?: Record<string, number>;
  mix_attribute_label?: string;
}

function toProduct(p: ApiProduct): Product {
  const imageUrls =
    p.image_urls && p.image_urls.length > 0
      ? p.image_urls
      : p.image_url
      ? [p.image_url]
      : [];
  return {
    id: p.id,
    storeId: p.store_id,
    name: p.name,
    price: p.price,
    salePrice: p.sale_price ?? undefined,
    description: p.description ?? "",
    imageUrl: imageUrls[0] ?? "",
    imageUrls,
    category: p.category ?? "",
    units: p.units ?? 0,
    trending: p.trending ?? false,
    variants: (p.variants ?? []).map(v => ({ label: v.label, values: v.values })),
    productType: p.product_type ?? "normal",
    affiliateUrl: p.affiliate_url ?? undefined,
    pricingTiers: p.pricing_tiers ?? [],
    mixOptions: p.mix_options ?? [],
    mixInventory: p.mix_inventory ?? {},
    mixAttributeLabel: p.mix_attribute_label ?? "",
  };
}

export const getProducts = (store_id: string) =>
  request<ApiProduct[]>(`/products?store_id=${store_id}`).then(list =>
    list.map(toProduct)
  );

export const getProduct = (id: string) =>
  request<ApiProduct>(`/products/${id}`).then(toProduct);

/**
 * Combined product-detail endpoint — returns product (with variants),
 * store, related products, and reviews in a single round-trip.
 */
export const getProductDetail = (id: string) =>
  request<{
    product: ApiProduct;
    store: Store;
    relatedProducts: ApiProduct[];
    reviews?: ApiReview[];
  }>(`/product-detail/${id}`).then(r => ({
    product: toProduct(r.product),
    store: r.store,
    relatedProducts: r.relatedProducts.map(toProduct),
    reviews: (r.reviews ?? []).map(toReview),
  }));

/** Deferred related-products loader — called after main content renders. */
export const getRelatedProducts = (id: string) =>
  request<{ relatedProducts: ApiProduct[] }>(`/product-related/${id}`)
    .then(r => r.relatedProducts.map(toProduct))
    .catch(() => [] as Product[]);

export const createProduct = (body: {
  store_id: string;
  name: string;
  price: number;
  sale_price?: number;
  description?: string;
  image_url?: string;
  image_urls?: string[];
  category?: string;
  units?: number;
  variants?: ProductVariant[];
  product_type?: "normal" | "mix_match" | "affiliate";
  affiliate_url?: string;
  pricing_tiers?: PricingTier[];
  mix_options?: string[];
  mix_inventory?: Record<string, number>;
  mix_attribute_label?: string;
}) => request<ApiProduct>("/products", { method: "POST", body: JSON.stringify(body) }).then(toProduct);

export const updateProduct = (id: string, body: Partial<{
  name: string;
  price: number;
  sale_price: number | null;
  description: string;
  image_url: string;
  image_urls: string[];
  category: string;
  units: number;
  trending: boolean;
  variants: ProductVariant[];
  product_type: "normal" | "mix_match" | "affiliate";
  affiliate_url: string;
  pricing_tiers: PricingTier[];
  mix_options: string[];
  mix_inventory: Record<string, number>;
  mix_attribute_label: string;
}>) => request<ApiProduct>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then(toProduct);

export const deleteProduct = (id: string) =>
  request<void>(`/products/${id}`, { method: "DELETE" });

// ── Reviews ──────────────────────────────────────────────────
export interface ApiReview {
  id: string;
  product_id: string;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
  image_url?: string;
}

function toReview(r: ApiReview): Review {
  return {
    id: r.id,
    product_id: r.product_id,
    name: r.name,
    rating: r.rating,
    comment: r.comment,
    image_url: r.image_url,
    date: new Date(r.created_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
}

export const getReviews = (product_id: string) =>
  request<ApiReview[]>(`/reviews?product_id=${product_id}`).then(list =>
    list.map(toReview)
  );

export const getStoreReviews = (store_id: string) =>
  request<ApiReview[]>(`/reviews?store_id=${store_id}`).then(list =>
    list.map(toReview)
  );

export const createReview = (body: {
  product_id: string;
  name: string;
  rating: number;
  comment: string;
  image_url?: string;
}) => request<ApiReview>("/reviews", { method: "POST", body: JSON.stringify(body) }).then(toReview);

// ── Analytics ─────────────────────────────────────────────────
export interface AnalyticsSummary {
  totalClicks: number;
  totalReviews: number;
  avgRating: string | null;
  inStock: number;
  outOfStock: number;
  productClicks: { productId: string; name: string; clicks: number }[];
  mostClicked: { productId: string; name: string; clicks: number } | null;
  leastClicked: { productId: string; name: string; clicks: number } | null;
  categoryBreakdown: { category: string; clicks: number; color: string }[];
  weeklyClicks: { day: string; clicks: number }[];
}

export const getAnalytics = (store_id: string) =>
  request<AnalyticsSummary>(`/analytics/${store_id}`);

export interface ProductAnalytics {
  totalClicks: number;
  weeklyClicks: { day: string; clicks: number }[];
}

export const getProductAnalytics = (product_id: string) =>
  request<ProductAnalytics>(`/analytics/product/${product_id}`);

// Convert any image format (AVIF, WebP, HEIC, PNG, etc.) to JPEG in the browser
// using the Canvas API before uploading. This guarantees stored images are always
// JPEG — compatible with Pinterest, WhatsApp, and all social crawlers.
const convertToJpeg = (file: File, quality = 0.88): Promise<File> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return reject(new Error("Canvas not available"));
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Image conversion failed"));
          const jpegName = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob], jpegName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for conversion"));
    };
    img.src = objectUrl;
  });

export const uploadImage = async (file: File): Promise<string> => {
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image is too large. Please choose an image under 15 MB.");
  }
  const jpeg = await convertToJpeg(file);
  const formData = new FormData();
  formData.append("image", jpeg);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Image upload failed");
  }
  const data = await res.json();
  return data.url as string;
};

export const trackClick = (product_id: string, store_id: string) =>
  request<void>("/analytics/click", {
    method: "POST",
    body: JSON.stringify({ product_id, store_id }),
  }).catch(() => {}); // fire-and-forget; never throw

// ── Payments ─────────────────────────────────────────────────
export interface RazorpayOrderResponse {
  order_id: string;
  key_id: string;
  amount: number;
  currency: string;
}

export interface OnboardRazorpayBody {
  store_id: string;
  legal_business_name: string;
  contact_name: string;
  business_type: string;
  email: string;
  phone: string;
  pan: string;
  category: string;
  subcategory: string;
  city: string;
  state: string;
  postal_code: string;
  street1?: string;
}

export const onboardRazorpay = (body: OnboardRazorpayBody) =>
  request<{ account_id: string; status: string }>("/payments/razorpay/onboard", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const createRazorpayOrder = (store_id: string, amount_paise: number, receipt?: string) =>
  request<RazorpayOrderResponse>("/payments/razorpay/create-order", {
    method: "POST",
    body: JSON.stringify({ store_id, amount_paise, receipt }),
  });

export const verifyRazorpayPayment = (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  store_id: string;
}) =>
  request<{ verified: boolean }>("/payments/razorpay/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// ── Orders ────────────────────────────────────────────────────
export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  mixData?: {
    selectedTier: { quantity: number; price: number };
    composition: { option: string; qty: number }[];
  };
}

export interface OrderBuyer {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export type OrderStatus = "pending" | "confirmed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
export type PaymentMethod = "advize" | "razorpay";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface Order {
  id: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  cashfree_order_id?: string;
  cashfree_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount_paise: number;
  items: OrderItem[];
  buyer: OrderBuyer;
  status: OrderStatus;
  created_at: any;
  updated_at?: any;
  // Shipping fields
  shiprocket_order_id?: number | null;
  shiprocket_shipment_id?: number | null;
  shiprocket_awb_code?: string | null;
  shiprocket_courier_name?: string | null;
  shiprocket_pickup_location?: string | null;
  shipping_status?: string | null;
  shipping_etd?: string | null;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenueRupees: number;
  pendingOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  recentOrders: Order[];
  orders: Order[];
}

export const createOrder = (payload: {
  store_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount_paise: number;
  items: OrderItem[];
  buyer: OrderBuyer;
}) =>
  request<{ id: string }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createAdvizeOrder = (payload: {
  store_id: string;
  amount_paise: number;
  items: OrderItem[];
  buyer: OrderBuyer;
  slug: string;
}) =>
  request<{ request_id: string; order_id: string }>(
    "/advize-pay/create-order",
    { method: "POST", body: JSON.stringify(payload) }
  );

export const getOrderStats = (store_id: string) =>
  request<OrderStats>(`/orders/store/${store_id}`);

export const getOrdersByPhone = (store_id: string, phone: string) =>
  request<{ orders: Order[] }>(`/orders/by-phone?store_id=${encodeURIComponent(store_id)}&phone=${encodeURIComponent(phone)}`);

export const updateOrderStatus = (order_id: string, status: OrderStatus) =>
  request<{ ok: boolean; status: string }>(`/orders/${order_id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// ── Payouts ──────────────────────────────────────────────────
export interface PayoutRequest {
  id: string;
  store_id: string;
  upi_id: string;
  amount_requested: number;
  status: "pending" | "processed" | "rejected";
  created_at: any;
}

export const requestPayout = (payload: {
  store_id: string;
  upi_id: string;
  amount_requested: number;
}) =>
  request<{ id: string; status: string }>("/payouts/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getPayoutRequests = (store_id: string) =>
  request<{ requests: PayoutRequest[] }>(`/payouts/requests/${store_id}`);

// ── Instagram DM Automation ───────────────────────────────────────────────────
export interface IgRule {
  id: string;
  store_id: string;
  keyword: string;
  match_type: "exact" | "contains" | "starts_with";
  reply: string;
  enabled: boolean;
}

export const getIgRules = (storeId: string) =>
  request<{ rules: IgRule[] }>(`/instagram/rules/${storeId}`);

export const createIgRule = (
  storeId: string,
  data: { keyword: string; match_type: string; reply: string; enabled?: boolean },
) =>
  request<IgRule>(`/instagram/rules/${storeId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateIgRule = (
  storeId: string,
  ruleId: string,
  data: Partial<{ keyword: string; match_type: string; reply: string; enabled: boolean }>,
) =>
  request<{ ok: boolean }>(`/instagram/rules/${storeId}/${ruleId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteIgRule = (storeId: string, ruleId: string) =>
  request<void>(`/instagram/rules/${storeId}/${ruleId}`, { method: "DELETE" });

export const disconnectInstagram = (storeId: string) =>
  request<{ ok: boolean }>("/instagram/disconnect", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId }),
  });

export interface IgTestResult {
  ok: boolean;
  step?: string;
  error?: string;
  ig_user_id?: string;
  username?: string;
  token_expires_at?: string | null;
  days_until_expiry?: number | null;
  permissions?: string[];
  has_messages_permission?: boolean;
  warning?: string | null;
  meta?: unknown;
}

export const testInstagramConnection = (storeId: string) =>
  request<IgTestResult>("/instagram/test", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId }),
  });

// ── Coupon Codes ─────────────────────────────────────────────────────────────

export type Coupon = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  description: string;
  max_uses: number | null;
  uses: number;
  active: boolean;
};

export type PublicCoupon = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  description: string;
};

export type CouponValidation = {
  valid: boolean;
  code?: string;
  type?: "percent" | "fixed";
  value?: number;
  description?: string;
  discount_rupees?: number;
  error?: string;
};

export const getCoupons = (storeId: string) =>
  request<Coupon[]>(`/coupons/${storeId}`);

export const getPublicCoupons = (storeId: string) =>
  request<PublicCoupon[]>(`/coupons/public/${storeId}`);

export const createCoupon = (data: {
  store_id: string; code: string; type: "percent" | "fixed";
  value: number; description?: string; max_uses?: number | null;
}) => request<{ code: string }>("/coupons", { method: "POST", body: JSON.stringify(data) });

export const deleteCoupon = (storeId: string, code: string) =>
  request<{ ok: boolean }>(`/coupons/${storeId}/${encodeURIComponent(code)}`, { method: "DELETE" });

export const validateCoupon = (storeId: string, code: string, subtotalPaise: number) =>
  request<CouponValidation>("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId, code, subtotal_paise: subtotalPaise }),
  });

// ── WhatsApp Marketing ────────────────────────────────────────────────────────

export interface WaCampaign {
  id: string;
  store_id: string;
  name: string;
  message: string;
  audience_filter: "all" | "buyers" | "new";
  scheduled_at: number | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  stats: { total: number; sent: number; delivered: number; failed: number; read: number };
  created_at: number;
  updated_at: number;
  sent_at: number | null;
}

export interface WaTemplate {
  id: string;
  store_id: string;
  name: string;
  body: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  created_at: number;
  updated_at: number;
}

export interface WaContact {
  id: string;
  store_id: string;
  phone: string;
  name: string;
  opted_in: boolean;
  tags: string[];
  joined_at: number;
  last_order_at: number | null;
  total_orders: number;
}

export interface WaAnalytics {
  total_contacts: number;
  total_campaigns: number;
  total_sent: number;
  total_failed: number;
  delivery_rate: number;
  recent_campaigns: WaCampaign[];
}

export interface WaTestResult {
  ok: boolean;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  error?: string;
}

export const getWAConfig = () =>
  request<{ app_id: string }>("/wa/config");

export const waEmbeddedSignup = (storeId: string, code: string) =>
  request<{ ok: boolean; verified_name: string; display_phone: string; waba_name: string }>(
    "/wa/embedded-signup",
    { method: "POST", body: JSON.stringify({ store_id: storeId, code }) },
  );

export const connectWA = (data: {
  store_id: string;
  phone_number_id: string;
  access_token: string;
  business_phone: string;
  display_name?: string;
  waba_id?: string;
}) =>
  request<{ ok: boolean; verified_name: string; display_phone: string }>("/wa/connect", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const disconnectWA = (storeId: string) =>
  request<{ ok: boolean }>("/wa/disconnect", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId }),
  });

export const testWA = (storeId: string) =>
  request<WaTestResult>("/wa/test", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId }),
  });

export const getWACampaigns = (storeId: string) =>
  request<{ campaigns: WaCampaign[] }>(`/wa/campaigns/${storeId}`);

export const createWACampaign = (data: {
  store_id: string;
  name: string;
  message: string;
  audience_filter?: string;
  scheduled_at?: number | null;
}) =>
  request<WaCampaign>("/wa/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteWACampaign = (id: string) =>
  request<{ ok: boolean }>(`/wa/campaigns/${id}`, { method: "DELETE" });

export const sendWACampaign = (id: string) =>
  request<{ ok: boolean; total: number; message: string }>(`/wa/campaigns/${id}/send`, {
    method: "POST",
  });

export const getWATemplates = (storeId: string) =>
  request<{ templates: WaTemplate[] }>(`/wa/templates/${storeId}`);

export const createWATemplate = (data: {
  store_id: string;
  name: string;
  body: string;
  category?: string;
}) =>
  request<WaTemplate>("/wa/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateWATemplate = (
  id: string,
  data: Partial<{ name: string; body: string; category: string }>,
) =>
  request<{ ok: boolean }>(`/wa/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteWATemplate = (id: string) =>
  request<{ ok: boolean }>(`/wa/templates/${id}`, { method: "DELETE" });

export const getWAContacts = (storeId: string) =>
  request<{ contacts: WaContact[] }>(`/wa/contacts/${storeId}`);

export const waOptin = (storeId: string, phone: string, name: string) =>
  request<{ ok: boolean; already: boolean }>("/wa/optin", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId, phone, name }),
  });

export const getWAAnalytics = (storeId: string) =>
  request<WaAnalytics>(`/wa/analytics/${storeId}`);

// ── Loyalty Program ───────────────────────────────────────────────────────────

export type LoyaltyCard = {
  enabled: boolean;
  stamps?: number;
  stamps_required?: number;
  reward?: string;
  redeemed_count?: number;
};

export type LoyaltyClaimRequest = {
  id: string;
  phone: string;
  stamps: number;
  reward: string;
  created_at: number | null;
  status: string;
};

export const getLoyaltyCard = (storeId: string, phone: string) =>
  request<LoyaltyCard>(
    `/loyalty/card?store_id=${encodeURIComponent(storeId)}&phone=${encodeURIComponent(phone)}`
  );

/** Customer-facing: saves a pending claim request. Returns the store's WhatsApp number. */
export const submitLoyaltyClaimRequest = (storeId: string, phone: string) =>
  request<{ success: boolean; whatsapp: string | null }>("/loyalty/claim-request", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId, phone }),
  });

/** Merchant-facing: fetches pending reward claim requests for this store. */
export const getLoyaltyClaimRequests = (storeId: string) =>
  request<LoyaltyClaimRequest[]>(
    `/loyalty/claim-requests?store_id=${encodeURIComponent(storeId)}`
  );

/** Merchant-facing: deducts stamps to confirm a customer's reward. */
export const redeemLoyalty = (storeId: string, phone: string) =>
  request<{ success: boolean }>("/loyalty/redeem", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId, phone }),
  });

// ── Shipping (Shiprocket) ─────────────────────────────────────────────────────

export interface ShippingCreateResult {
  shiprocketOrderId: number;
  shipmentId: number;
  awbCode: string | null;
  courierName: string | null;
}

export interface ShippingTrackResult {
  tracking_data?: {
    track_status?: number;
    shipment_track?: {
      awb_code?: string;
      courier_name?: string;
      current_status?: string;
      etd?: string;
      [key: string]: unknown;
    }[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ShippingLabelResult {
  label_url: string | null;
  raw?: unknown;
}

export const createShipment = (orderId: string, shopId: string, pickupLocation: string) =>
  request<ShippingCreateResult>("/shipping/create", {
    method: "POST",
    body: JSON.stringify({ orderId, shopId, pickupLocation }),
  });

export const trackShipmentById = (shipmentId: number | string) =>
  request<ShippingTrackResult>(`/shipping/track?shipmentId=${encodeURIComponent(String(shipmentId))}`);

export const trackShipmentByAwb = (awb: string) =>
  request<ShippingTrackResult>(`/shipping/track?awb=${encodeURIComponent(awb)}`);

export const cancelShipment = (orderId: string) =>
  request<{ ok: boolean }>("/shipping/cancel", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });

export const getShippingLabel = (orderId: string) =>
  request<ShippingLabelResult>(`/shipping/label?orderId=${encodeURIComponent(orderId)}`);

export const scheduleShipmentPickup = (orderId: string) =>
  request<{ ok: boolean }>("/shipping/pickup", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
