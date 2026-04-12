import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

router.get("/stores/:slug", async (req, res) => {
  const snap = await db.collection("stores").where("slug", "==", req.params.slug).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: "Store not found" });
  const doc = snap.docs[0];
  return res.json({ id: doc.id, ...doc.data() });
});

router.post("/stores", async (req, res) => {
  const { name, slug, whatsapp, category, location, owner_id } = req.body;
  if (!name || !slug || !whatsapp) {
    return res.status(400).json({ error: "name, slug, and whatsapp are required" });
  }
  // Check slug uniqueness
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
  return res.status(201).json({ id: doc.id, ...doc.data() });
});

router.patch("/stores/:id", async (req, res) => {
  const ref = db.collection("stores").doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Store not found" });
  await ref.update({ ...req.body, updated_at: FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return res.json({ id: updated.id, ...updated.data() });
});

export default router;
