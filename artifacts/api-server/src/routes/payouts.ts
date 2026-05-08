import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { verifyToken } from "../middlewares/verifyToken.js";
import { cacheDeleteByPrefix } from "../lib/cache.js";

const router = Router();

// Request a payout — saves request + updates store upi_id
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

    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(upi_id.trim())) {
      return res.status(400).json({ error: "Invalid UPI ID format (e.g. name@upi)" });
    }

    const storeRef = db.collection("stores").doc(store_id);
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeSnap.data() as any;
    if (storeData.owner_id && storeData.owner_id !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Save upi_id to store profile
    await storeRef.update({ upi_id: upi_id.trim(), updated_at: FieldValue.serverTimestamp() });
    cacheDeleteByPrefix(`store:id:${store_id}`);
    cacheDeleteByPrefix(`store:slug:${storeData.slug}`);
    cacheDeleteByPrefix(`store:owner:${uid}`);

    // Create payout request
    const ref = await db.collection("payout_requests").add({
      store_id,
      owner_id: uid,
      upi_id: upi_id.trim(),
      amount_requested,
      status: "pending",
      created_at: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ id: ref.id, status: "pending" });
  } catch (err: any) {
    console.error("payout request error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

// Get all payout requests for a store
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
      .orderBy("created_at", "desc")
      .limit(20)
      .get();

    const requests = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    return res.json({ requests });
  } catch (err: any) {
    console.error("payout requests fetch error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

export default router;
