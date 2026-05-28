import { Router } from "express";
import { db } from "../lib/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { cacheGet, cacheSet } from "../lib/cache.js";

const router = Router();
const TTL = 60_000; // 60 s

function sanitizeStore(id: string, data: FirebaseFirestore.DocumentData) {
  const { razorpay_key_secret: _s, owner_id: _o, ...safe } = data;
  return { id, ...safe };
}

function serializeTs(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  return (ts as number) ?? 0;
}

function serializeReview(d: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = d.data();
  const created = data.created_at;
  return {
    ...data,
    id: d.id,
    created_at:
      created instanceof Timestamp
        ? created.toDate().toISOString()
        : (created ?? new Date().toISOString()),
  };
}

/**
 * GET /product-detail/:id
 *
 * Returns { product (with variants), store, reviews, relatedProducts }
 * in a single client round-trip.  All Firestore work is done server-side
 * in parallel after the first mandatory product fetch.
 *
 * Cache: 60 s TTL (shares sub-caches with other routes).
 */
router.get("/product-detail/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `product-detail:${id}`;

  const cached = cacheGet<unknown>(cacheKey);
  if (cached) return res.json(cached);

  // ── Step 1: Fetch product (mandatory – we need storeId + category) ──
  const productDoc = await db.collection("products").doc(id).get();
  if (!productDoc.exists) return res.status(404).json({ error: "Product not found" });

  const productData = productDoc.data()!;
  const storeId: string = productData["store_id"];
  const category: string = productData["category"] ?? "";

  // ── Step 2: Parallel fetch – variants + store + reviews ──
  // Related products are intentionally excluded from this critical path.
  // On a cold start the full catalog query (needed to compute related items)
  // would block the initial render. Instead, the client fires a second
  // deferred request to /product-related/:id after the main content appears.
  // If the catalog is already warm in the server cache the related-products
  // endpoint is essentially free (in-memory filter only).
  const [variantsSnap, storeDoc, reviews] = await Promise.all([
    productDoc.ref.collection("variants").get(),
    (async () => {
      const cachedStore = cacheGet<any>(`store:id:${storeId}`);
      return cachedStore ?? db.collection("stores").doc(storeId).get();
    })(),
    (async () => {
      const cachedReviews = cacheGet<any[]>(`reviews:product:${id}`);
      if (cachedReviews) return cachedReviews;
      const snap = await db.collection("reviews").where("product_id", "==", id).get();
      const list = snap.docs.map(d => serializeReview(d));
      list.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      cacheSet(`reviews:product:${id}`, list, TTL);
      return list;
    })(),
  ]);

  // ── Build product ──
  const variants = variantsSnap.docs.map(v => ({ id: v.id, ...v.data() }));
  const product = {
    id,
    ...productData,
    created_at: serializeTs(productData["created_at"]),
    variants,
  };
  // Warm the meta cache so /product-related can skip Firestore on the next call
  cacheSet(`product:meta:${id}`, { storeId, category }, TTL);

  // ── Build store ──
  let store: any;
  if (typeof storeDoc === "object" && "exists" in storeDoc) {
    const snap = storeDoc as FirebaseFirestore.DocumentSnapshot;
    if (!snap.exists) return res.status(404).json({ error: "Store not found" });
    store = sanitizeStore(snap.id, snap.data()!);
    cacheSet(`store:id:${storeId}`, store, 60_000);
  } else {
    store = storeDoc;
  }

  const result = { product, store, reviews, relatedProducts: [] };
  cacheSet(cacheKey, result, TTL);
  return res.json(result);
});

export default router;
