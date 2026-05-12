import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { cacheDeleteByPrefix } from "../lib/cache.js";

const router = Router();

// ── Global kill-switch ────────────────────────────────────────────────────────
// Set to true to re-enable Advize payments across all stores.
const ADVIZE_PAYMENTS_ENABLED = false;

function getPlatformInstance(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

router.post("/advize-pay/create-order", async (req, res) => {
  if (!ADVIZE_PAYMENTS_ENABLED) {
    return res.status(503).json({ error: "Advize Payment is temporarily unavailable" });
  }
  try {
    const { store_id, amount_paise, items, buyer, slug } = req.body as {
      store_id: string;
      amount_paise: number;
      items: { productId: string; name: string; quantity: number; price: number }[];
      buyer: { name: string; phone: string; addressLine: string; city: string; pincode: string };
      slug: string;
    };

    if (!store_id || !amount_paise || !items?.length || !buyer || !slug) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data() as any;

    if (!storeData.advize_payment_enabled) {
      return res.status(403).json({ error: "Advize Payment not enabled for this store" });
    }

    const rzp = getPlatformInstance();
    if (!rzp) {
      return res.status(503).json({ error: "Payment gateway not configured" });
    }

    const receipt = `ADV${Date.now()}`;
    const order = await rzp.orders.create({
      amount: amount_paise,
      currency: "INR",
      receipt,
    });

    return res.json({
      order_id: order.id,
      key_id: process.env.RAZORPAY_KEY_ID!,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error("advize-pay create-order error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

router.post("/advize-pay/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      store_id, amount_paise, items, buyer,
    } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      store_id: string;
      amount_paise: number;
      items: { productId: string; name: string; quantity: number; price: number }[];
      buyer: { name: string; phone: string; addressLine: string; city: string; pincode: string };
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !store_id) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(503).json({ error: "Payment gateway not configured" });

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto.createHmac("sha256", keySecret).update(body).digest("hex");

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ verified: false, error: "Signature mismatch" });
    }

    const orderRef = await db.collection("orders").add({
      store_id,
      payment_method: "advize",
      razorpay_order_id,
      razorpay_payment_id,
      payment_status: "paid",
      amount_paise,
      items: items ?? [],
      buyer: buyer ?? null,
      status: "confirmed",
      created_at: FieldValue.serverTimestamp(),
    });

    cacheDeleteByPrefix(`orders:store:${store_id}`);

    return res.json({ verified: true, order_id: orderRef.id });
  } catch (err: any) {
    console.error("advize-pay verify error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

export default router;
