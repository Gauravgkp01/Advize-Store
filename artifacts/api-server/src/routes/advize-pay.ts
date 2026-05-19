import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { cacheDeleteByPrefix } from "../lib/cache.js";
import { awardLoyaltyStamp } from "../lib/loyalty.js";

const router = Router();

/**
 * POST /advize-pay/create-order
 * Saves the payment request to Firestore and returns the request ID.
 * No payment gateway is called — the platform accesses requests directly.
 */
router.post("/advize-pay/create-order", async (req, res) => {
  try {
    const { store_id, amount_paise, items, buyer, slug } = req.body as {
      store_id: string;
      amount_paise: number;
      items: { productId: string; name: string; quantity: number; price: number; mixData?: any }[];
      buyer: { name: string; phone: string; addressLine: string; city: string; state: string; pincode: string };
      slug: string;
    };

    if (!store_id || !amount_paise || !items?.length || !buyer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });

    const ref = await db.collection("advize_payment_requests").add({
      store_id,
      slug: slug ?? null,
      amount_paise,
      items: items ?? [],
      buyer: buyer ?? null,
      status: "pending",
      created_at: FieldValue.serverTimestamp(),
    });

    // Also save as an order immediately so it appears in the merchant's Earnings tab
    const orderRef = await db.collection("orders").add({
      store_id,
      payment_method: "advize",
      advize_request_id: ref.id,
      payment_status: "pending",
      amount_paise,
      items: items ?? [],
      buyer: buyer ?? null,
      status: "pending",
      created_at: FieldValue.serverTimestamp(),
    });

    cacheDeleteByPrefix(`orders:store:${store_id}`);

    // Award loyalty stamp (best-effort, non-blocking)
    (async () => {
      try { await awardLoyaltyStamp(store_id, buyer?.phone); } catch { /* best-effort */ }
    })();

    return res.status(201).json({ request_id: ref.id, order_id: orderRef.id });
  } catch (err: any) {
    console.error("advize-pay create-order error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

export default router;
