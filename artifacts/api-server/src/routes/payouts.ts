import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

// Save a withdrawal request to the database
router.post("/payouts/request", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  try {
    const { store_id, upi_id, amount_requested } = req.body as {
      store_id: string;
      upi_id: string;
      amount_requested: number;
    };

    if (!store_id || !upi_id?.trim() || !amount_requested) {
      return res.status(400).json({ error: "store_id, upi_id, and amount_requested are required" });
    }

    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data() as any;
    if (storeData.owner_id && storeData.owner_id !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const ref = await db.collection("payout_requests").add({
      store_id,
      owner_id: uid,
      upi_id: upi_id.trim(),
      amount_requested,
      status: "pending",
      created_at: FieldValue.serverTimestamp(),
    });

    // Deduct from available balance on the store document
    await db.collection("stores").doc(store_id).update({
      total_withdrawn: FieldValue.increment(amount_requested),
    });

    return res.status(201).json({ id: ref.id, status: "pending" });
  } catch (err: any) {
    console.error("payout request error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

// Get all withdrawal requests for a store
router.get("/payouts/requests/:store_id", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  try {
    const { store_id } = req.params;

    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data() as any;
    if (storeData.owner_id && storeData.owner_id !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const snap = await db.collection("payout_requests")
      .where("store_id", "==", store_id)
      .limit(20)
      .get();

    const requests = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .sort((a, b) => {
        const aMs = a.created_at?.toMillis?.() ?? 0;
        const bMs = b.created_at?.toMillis?.() ?? 0;
        return bMs - aMs;
      });
    return res.json({ requests });
  } catch (err: any) {
    console.error("payout requests fetch error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

export default router;
