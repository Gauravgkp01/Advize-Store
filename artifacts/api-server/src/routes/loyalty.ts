import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/**
 * GET /loyalty/card?store_id=xxx&phone=xxx
 * Returns the customer's loyalty card for a given store.
 */
router.get("/loyalty/card", async (req, res) => {
  const { store_id, phone } = req.query as { store_id?: string; phone?: string };
  if (!store_id || !phone) {
    return res.status(400).json({ error: "store_id and phone are required" });
  }

  try {
    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data()!;

    if (!storeData.loyalty_enabled) {
      return res.json({ enabled: false });
    }

    const cardId = `${store_id}_${normalizePhone(phone)}`;
    const cardSnap = await db.collection("loyalty_cards").doc(cardId).get();

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      enabled: true,
      stamps_required: storeData.loyalty_stamps_required ?? 10,
      reward: storeData.loyalty_reward ?? "",
      stamps: cardSnap.exists ? (cardSnap.data()!.stamps ?? 0) : 0,
      redeemed_count: cardSnap.exists ? (cardSnap.data()!.redeemed_count ?? 0) : 0,
    });
  } catch (err: any) {
    console.error("loyalty card fetch error:", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

/**
 * POST /loyalty/redeem
 * Body: { store_id, phone }
 * Deducts stamps_required stamps and increments redeemed_count.
 */
router.post("/loyalty/redeem", async (req, res) => {
  const { store_id, phone } = req.body as { store_id?: string; phone?: string };
  if (!store_id || !phone) {
    return res.status(400).json({ error: "store_id and phone are required" });
  }

  try {
    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data()!;
    const stampsRequired: number = storeData.loyalty_stamps_required ?? 10;

    const cardId = `${store_id}_${normalizePhone(phone)}`;
    const cardRef = db.collection("loyalty_cards").doc(cardId);

    await db.runTransaction(async (tx) => {
      const cardSnap = await tx.get(cardRef);
      if (!cardSnap.exists) throw new Error("No loyalty card found for this customer.");
      const currentStamps: number = cardSnap.data()!.stamps ?? 0;
      if (currentStamps < stampsRequired) {
        throw new Error(`Need ${stampsRequired} stamps to redeem. You have ${currentStamps}.`);
      }
      tx.update(cardRef, {
        stamps: FieldValue.increment(-stampsRequired),
        redeemed_count: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message ?? "Redemption failed" });
  }
});

export default router;
