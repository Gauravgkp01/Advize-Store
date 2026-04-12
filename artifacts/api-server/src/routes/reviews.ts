import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

router.get("/reviews", async (req, res) => {
  const { product_id } = req.query;
  if (!product_id) return res.status(400).json({ error: "product_id is required" });
  const snap = await db.collection("reviews")
    .where("product_id", "==", product_id)
    .orderBy("created_at", "desc")
    .get();
  return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

router.post("/reviews", async (req, res) => {
  const { product_id, name, rating, comment } = req.body;
  if (!product_id || !name || !rating || !comment) {
    return res.status(400).json({ error: "product_id, name, rating, and comment are required" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be between 1 and 5" });
  }
  const ref = await db.collection("reviews").add({
    product_id, name, rating, comment,
    created_at: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return res.status(201).json({ id: doc.id, ...doc.data() });
});

export default router;
