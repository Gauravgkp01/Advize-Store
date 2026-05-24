import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { verifyToken } from "../middlewares/verifyToken.js";

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

    if (storeData.loyalty_enabled === false) {
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
 * POST /loyalty/claim-request
 * Body: { store_id, phone }
 * Customer-facing: saves a pending claim to Firestore.
 * No auth required. Returns the store's WhatsApp number so the client
 * can open a pre-filled WA message to the merchant.
 */
router.post("/loyalty/claim-request", async (req, res) => {
  const { store_id, phone } = req.body as { store_id?: string; phone?: string };
  if (!store_id || !phone) {
    return res.status(400).json({ error: "store_id and phone are required" });
  }

  try {
    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data()!;

    if (!storeData.loyalty_enabled) {
      return res.status(400).json({ error: "Loyalty program is not active for this store" });
    }

    const normalizedPhone = normalizePhone(phone);
    const cardId = `${store_id}_${normalizedPhone}`;
    const cardSnap = await db.collection("loyalty_cards").doc(cardId).get();

    if (!cardSnap.exists) {
      return res.status(400).json({ error: "No loyalty card found for this number" });
    }

    const stampsRequired: number = storeData.loyalty_stamps_required ?? 10;
    const stamps: number = cardSnap.data()!.stamps ?? 0;

    if (stamps < stampsRequired) {
      return res.status(400).json({
        error: `Not enough stamps. You have ${stamps}, need ${stampsRequired}.`,
      });
    }

    await db.collection("loyalty_claim_requests")
      .doc(`${store_id}_${normalizedPhone}`)
      .set({
        store_id,
        phone: normalizedPhone,
        stamps,
        reward: storeData.loyalty_reward ?? "",
        created_at: FieldValue.serverTimestamp(),
        status: "pending",
      }, { merge: true });

    return res.json({ success: true, whatsapp: storeData.whatsapp ?? null });
  } catch (err: any) {
    console.error("loyalty claim-request error:", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

/**
 * GET /loyalty/claim-requests?store_id=xxx
 * Merchant-only: returns pending reward claim requests for the store.
 */
router.get("/loyalty/claim-requests", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { store_id } = req.query as { store_id?: string };
  if (!store_id) return res.status(400).json({ error: "store_id is required" });

  try {
    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data()!;

    if (storeData.owner_id && storeData.owner_id !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const snap = await db.collection("loyalty_claim_requests")
      .where("store_id", "==", store_id)
      .where("status", "==", "pending")
      .orderBy("created_at", "desc")
      .limit(50)
      .get();

    const claims = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toMillis?.() ?? null,
    }));

    res.setHeader("Cache-Control", "no-store");
    return res.json(claims);
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

/**
 * POST /loyalty/redeem
 * Body: { store_id, phone }
 * Merchant-only: deducts stamps_required stamps and marks the claim request as confirmed.
 */
router.post("/loyalty/redeem", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { store_id, phone } = req.body as { store_id?: string; phone?: string };
  if (!store_id || !phone) {
    return res.status(400).json({ error: "store_id and phone are required" });
  }

  try {
    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data()!;
    if (storeData.owner_id && storeData.owner_id !== uid) {
      return res.status(403).json({ error: "Forbidden: only the store owner can redeem loyalty rewards" });
    }
    const stampsRequired: number = storeData.loyalty_stamps_required ?? 10;

    const normalizedPhone = normalizePhone(phone);
    const cardId = `${store_id}_${normalizedPhone}`;
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

    // Mark the claim request as confirmed (best-effort)
    db.collection("loyalty_claim_requests")
      .doc(`${store_id}_${normalizedPhone}`)
      .update({ status: "confirmed" })
      .catch(() => {});

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message ?? "Redemption failed" });
  }
});

export default router;
