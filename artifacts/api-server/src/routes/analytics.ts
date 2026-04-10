import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

router.post("/analytics/click", async (req, res) => {
  const { product_id, store_id } = req.body;
  if (!product_id || !store_id) {
    return res.status(400).json({ error: "product_id and store_id are required" });
  }
  const { error } = await supabase
    .from("product_clicks")
    .insert({ product_id, store_id });
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ ok: true });
});

router.get("/analytics/:store_id", async (req, res) => {
  const { store_id } = req.params;

  const [clicksRes, reviewsRes, productsRes] = await Promise.all([
    supabase
      .from("product_clicks")
      .select("product_id, products(name)")
      .eq("store_id", store_id),
    supabase
      .from("reviews")
      .select("rating, product_id, products(store_id)")
      .eq("products.store_id", store_id),
    supabase
      .from("products")
      .select("id, name, units, category")
      .eq("store_id", store_id),
  ]);

  const clicks = clicksRes.data || [];
  const reviews = reviewsRes.data || [];
  const products = productsRes.data || [];

  const clicksByProduct: Record<string, { name: string; clicks: number }> = {};
  for (const c of clicks) {
    const pid = c.product_id;
    if (!clicksByProduct[pid]) {
      clicksByProduct[pid] = { name: (c.products as any)?.name ?? pid, clicks: 0 };
    }
    clicksByProduct[pid].clicks++;
  }

  const productClickList = Object.entries(clicksByProduct)
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.clicks - a.clicks);

  const totalClicks = productClickList.reduce((s, p) => s + p.clicks, 0);

  const ratingSum = reviews.reduce((s, r) => s + r.rating, 0);
  const avgRating = reviews.length ? (ratingSum / reviews.length).toFixed(1) : null;

  const inStock = products.filter(p => p.units > 0).length;
  const outOfStock = products.filter(p => p.units === 0).length;

  return res.json({
    totalClicks,
    totalReviews: reviews.length,
    avgRating,
    inStock,
    outOfStock,
    productClicks: productClickList,
    mostClicked: productClickList[0] ?? null,
    leastClicked: productClickList[productClickList.length - 1] ?? null,
  });
});

export default router;
