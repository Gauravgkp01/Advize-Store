import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "../lib/firebase.js";
const router = Router();

router.post("/payments/razorpay/create-order", async (req, res) => {
  try {
    const { store_id, amount_paise, receipt } = req.body as {
      store_id: string;
      amount_paise: number;
      receipt?: string;
    };

    if (!store_id || !amount_paise) {
      return res.status(400).json({ error: "store_id and amount_paise are required" });
    }

    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });

    const storeData = storeSnap.data() as any;

    const keyId: string | undefined = storeData.razorpay_key_id;
    const keySecret: string | undefined = storeData.razorpay_key_secret;

    if (!keyId || !keySecret) {
      return res.status(400).json({ error: "Payment gateway not configured for this store" });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: amount_paise,
      currency: "INR",
      receipt: receipt ?? `rcpt_${Date.now()}`,
    });

    return res.json({ order_id: order.id, key_id: keyId, amount: order.amount, currency: order.currency });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Failed to create payment order" });
  }
});

router.post("/payments/razorpay/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, store_id } = req.body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    store_id: string;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !store_id) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data() as any;
    const keySecret: string | undefined = storeData.razorpay_key_secret;
    if (!keySecret) return res.status(400).json({ error: "Payment gateway not configured" });

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      return res.json({ verified: true });
    } else {
      return res.status(400).json({ verified: false, error: "Signature mismatch" });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Verification failed" });
  }
});

export default router;
