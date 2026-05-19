import { Router } from "express";
import { db } from "../lib/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { cacheGet, cacheSet } from "../lib/cache.js";

const router = Router();
const TTL = 60_000;

function serializeTs(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  return (ts as number) ?? 0;
}

/**
 * GET /product-related/:id
 *
 * Deferred "You may also like" loader — called by the client only after
 * the main product + store content is already visible on screen.
 *
 * On a warm server cache this is an in-memory filter (< 1 ms).
 * On a cold start it triggers the full catalog fetch, but by that point
 * the user is already looking at the product page.
 */
router.get("/product-related/:id", async (req, res) => {
  const { id } = req.params;

  // Try the lightweight meta cache first (populated by storefront + product-detail).
  // This lets us skip the individual product Firestore read on warm cache.
  let storeId: string;
  let category: string;
  const meta = cacheGet<{ storeId: string; category: string }>(`product:meta:${id}`);
  if (meta) {
    storeId = meta.storeId;
    category = meta.category;
  } else {
    const productDoc = await db.collection("products").doc(id).get();
    if (!productDoc.exists) return res.status(404).json({ error: "Product not found" });
    const productData = productDoc.data()!;
    storeId = productData["store_id"];
    category = productData["category"] ?? "";
    cacheSet(`product:meta:${id}`, { storeId, category }, TTL);
  }

  let allProducts: any[] = cacheGet<any[]>(`products:list:${storeId}`) ?? [];

  if (allProducts.length === 0) {
    const snap = await db.collection("products")
      .where("store_id", "==", storeId)
      .get();
    allProducts = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      created_at: serializeTs((d.data() as any)["created_at"]),
    }));
    allProducts.sort((a, b) => b.created_at - a.created_at);
    cacheSet(`products:list:${storeId}`, allProducts, TTL);
  }

  const related = allProducts
    .filter((p: any) => p.id !== id && p.category === category)
    .slice(0, 6);

  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return res.json({ relatedProducts: related });
});

export default router;
