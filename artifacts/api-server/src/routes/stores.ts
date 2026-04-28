import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

function sanitizeStore(id: string, data: FirebaseFirestore.DocumentData) {
  const { razorpay_key_secret: _secret, owner_id: _owner, ...safe } = data;
  return { id, ...safe };
}

router.get("/stores", async (req, res) => {
  const { owner_id } = req.query;
  if (!owner_id) return res.status(400).json({ error: "owner_id is required" });
  const snap = await db.collection("stores").where("owner_id", "==", owner_id).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: "Store not found" });
  const doc = snap.docs[0];
  return res.json(sanitizeStore(doc.id, doc.data()));
});

router.get("/stores/id/:id", async (req, res) => {
  const doc = await db.collection("stores").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "Store not found" });
  return res.json(sanitizeStore(doc.id, doc.data()!));
});

router.get("/stores/:slug", async (req, res) => {
  const snap = await db.collection("stores").where("slug", "==", req.params.slug).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: "Store not found" });
  const doc = snap.docs[0];
  return res.json(sanitizeStore(doc.id, doc.data()));
});

router.post("/stores", verifyToken, async (req, res) => {
  const owner_id = (req as any).uid;
  const { name, slug, whatsapp, category, location } = req.body;
  if (!name || !slug || !whatsapp) {
    return res.status(400).json({ error: "name, slug, and whatsapp are required" });
  }
  const existing = await db.collection("stores").where("slug", "==", slug).limit(1).get();
  if (!existing.empty) return res.status(400).json({ error: "Slug already taken" });

  const ref = await db.collection("stores").add({
    name, slug, whatsapp,
    category: category ?? "",
    location: location ?? "",
    owner_id: owner_id ?? null,
    created_at: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return res.status(201).json(sanitizeStore(doc.id, doc.data()!));
});

router.patch("/stores/:id", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const ref = db.collection("stores").doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Store not found" });

  const storeData = snap.data() as any;
  if (storeData.owner_id && storeData.owner_id !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { razorpay_key_secret, ...safeBody } = req.body;

  const updatePayload: Record<string, any> = {
    ...safeBody,
    updated_at: FieldValue.serverTimestamp(),
  };
  if (razorpay_key_secret && typeof razorpay_key_secret === "string" && razorpay_key_secret.trim()) {
    updatePayload.razorpay_key_secret = razorpay_key_secret.trim();
  }

  await ref.update(updatePayload);
  const updated = await ref.get();
  return res.json(sanitizeStore(updated.id, updated.data()!));
});

export default router;
