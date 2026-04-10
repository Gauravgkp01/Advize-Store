import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#8b5cf6", "#10b981"];

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
      .select("product_id, clicked_at, products(name, category)")
      .eq("store_id", store_id),
    supabase
      .from("reviews")
      .select("rating, product_id, products!inner(store_id)")
      .eq("products.store_id", store_id),
    supabase
      .from("products")
      .select("id, name, units, category")
      .eq("store_id", store_id),
  ]);

  const clicks = clicksRes.data || [];
  const reviews = reviewsRes.data || [];
  const products = productsRes.data || [];

  // ── Product clicks ──────────────────────────────────────
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

  // ── Category breakdown from real click data ─────────────
  const clicksByCategory: Record<string, number> = {};
  for (const c of clicks) {
    const cat = (c.products as any)?.category ?? "Uncategorised";
    clicksByCategory[cat] = (clicksByCategory[cat] ?? 0) + 1;
  }

  // Also include categories from products that have 0 clicks
  for (const p of products) {
    const cat = p.category || "Uncategorised";
    if (!(cat in clicksByCategory)) clicksByCategory[cat] = 0;
  }

  const categoryBreakdown = Object.entries(clicksByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, clicks], i) => ({
      category,
      clicks,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  // ── Weekly clicks (last 7 days) ─────────────────────────
  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyClicks = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayLabel = days[d.getDay()];
    const dateStr = d.toISOString().slice(0, 10);
    const count = clicks.filter(c => {
      const cd = typeof c.clicked_at === "string" ? c.clicked_at.slice(0, 10) : "";
      return cd === dateStr;
    }).length;
    return { day: dayLabel, clicks: count };
  });

  // ── Reviews ──────────────────────────────────────────────
  const ratingSum = reviews.reduce((s, r) => s + r.rating, 0);
  const avgRating = reviews.length ? (ratingSum / reviews.length).toFixed(1) : null;

  // ── Stock ────────────────────────────────────────────────
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
    categoryBreakdown,
    weeklyClicks,
  });
});

// ── Single-product analytics (owner view) ──────────────
router.get("/analytics/product/:product_id", async (req, res) => {
  const { product_id } = req.params;

  const { data: clicks } = await supabase
    .from("product_clicks")
    .select("clicked_at")
    .eq("product_id", product_id);

  const allClicks = clicks ?? [];
  const totalClicks = allClicks.length;

  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyClicks = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayLabel = days[d.getDay()];
    const dateStr = d.toISOString().slice(0, 10);
    const count = allClicks.filter(c => {
      const cd = typeof c.clicked_at === "string" ? c.clicked_at.slice(0, 10) : "";
      return cd === dateStr;
    }).length;
    return { day: dayLabel, clicks: count };
  });

  return res.json({ totalClicks, weeklyClicks });
});

export default router;
