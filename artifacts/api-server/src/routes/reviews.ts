import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

function serializeReview(data: FirebaseFirestore.DocumentData, id: string) {
  const created = data.created_at;
  return {
    ...data,
    id,
    created_at: created instanceof Timestamp
      ? created.toDate().toISOString()
      : (created ?? new Date().toISOString()),
  };
}

const router = Router();

router.get("/reviews", async (req, res) => {
  const { product_id, store_id } = req.query;

  if (store_id) {
    // Fetch all reviews for a store (via its products)
    const productsSnap = await db.collection("products")
      .where("store_id", "==", store_id)
      .get();
    const productIds = productsSnap.docs.map(d => d.id);
    if (productIds.length === 0) return res.json([]);
    const snap = await db.collection("reviews")
      .where("product_id", "in", productIds)
      .get();
    const reviews = snap.docs.map(d => serializeReview(d.data(), d.id));
    reviews.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return res.json(reviews);
  }

  if (!product_id) return res.status(400).json({ error: "product_id or store_id is required" });
  const snap = await db.collection("reviews")
    .where("product_id", "==", product_id)
    .get();
  const reviews = snap.docs.map(d => serializeReview(d.data(), d.id));
  reviews.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return res.json(reviews);
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
  return res.status(201).json(serializeReview(doc.data()!, doc.id));
});

export default router;
