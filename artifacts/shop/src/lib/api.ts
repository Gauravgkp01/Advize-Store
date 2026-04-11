import type { Product, ProductVariant, Review } from "./mock-data";

const BASE = `${import.meta.env.BASE_URL}api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Stores ──────────────────────────────────────────────────
export interface Store {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  category?: string;
  location?: string;
}

export const getStore = (slug: string) =>
  request<Store>(`/stores/${slug}`);

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
  description: string;
  image_url: string;
  category: string;
  units: number;
  variants: { id: string; label: string; values: string[] }[];
}

function toProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    storeId: p.store_id,
    name: p.name,
    price: p.price,
    description: p.description ?? "",
    imageUrl: p.image_url ?? "",
    category: p.category ?? "",
    units: p.units ?? 0,
    variants: (p.variants ?? []).map(v => ({ label: v.label, values: v.values })),
  };
}

export const getProducts = (store_id: string) =>
  request<ApiProduct[]>(`/products?store_id=${store_id}`).then(list =>
    list.map(toProduct)
  );

export const getProduct = (id: string) =>
  request<ApiProduct>(`/products/${id}`).then(toProduct);

export const createProduct = (body: {
  store_id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category?: string;
  units?: number;
  variants?: ProductVariant[];
}) => request<ApiProduct>("/products", { method: "POST", body: JSON.stringify(body) }).then(toProduct);

export const updateProduct = (id: string, body: Partial<{
  name: string;
  price: number;
  description: string;
  image_url: string;
  category: string;
  units: number;
  variants: ProductVariant[];
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
}

function toReview(r: ApiReview): Review {
  return {
    id: r.id,
    name: r.name,
    rating: r.rating,
    comment: r.comment,
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

export const createReview = (body: {
  product_id: string;
  name: string;
  rating: number;
  comment: string;
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

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
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
