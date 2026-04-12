import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

function docToProduct(doc: FirebaseFirestore.DocumentSnapshot) {
  return { id: doc.id, ...doc.data() };
}

router.get("/products", async (req, res) => {
  const { store_id } = req.query;
  let query: FirebaseFirestore.Query = db.collection("products");
  if (store_id) query = query.where("store_id", "==", store_id);
  const snap = await query.orderBy("created_at", "desc").get();
  const products = await Promise.all(
    snap.docs.map(async (doc) => {
      const variantsSnap = await doc.ref.collection("variants").get();
      const variants = variantsSnap.docs.map(v => ({ id: v.id, ...v.data() }));
      return { id: doc.id, ...doc.data(), variants };
    })
  );
  return res.json(products);
});

router.get("/products/:id", async (req, res) => {
  const doc = await db.collection("products").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "Product not found" });
  const variantsSnap = await doc.ref.collection("variants").get();
  const variants = variantsSnap.docs.map(v => ({ id: v.id, ...v.data() }));
  return res.json({ id: doc.id, ...doc.data(), variants });
});

router.post("/products", async (req, res) => {
  const { store_id, name, price, description, image_url, category, units, variants } = req.body;
  if (!store_id || !name || !price) {
    return res.status(400).json({ error: "store_id, name, and price are required" });
  }
  const ref = await db.collection("products").add({
    store_id, name, price, description: description ?? "",
    image_url: image_url ?? "", category: category ?? "",
    units: units ?? 0,
    created_at: FieldValue.serverTimestamp(),
  });

  if (variants && Array.isArray(variants) && variants.length > 0) {
    const batch = db.batch();
    for (const v of variants) {
      const vRef = ref.collection("variants").doc();
      batch.set(vRef, { label: v.label, values: v.values });
    }
    await batch.commit();
  }

  const doc = await ref.get();
  const variantsSnap = await ref.collection("variants").get();
  const savedVariants = variantsSnap.docs.map(v => ({ id: v.id, ...v.data() }));
  return res.status(201).json({ id: doc.id, ...doc.data(), variants: savedVariants });
});

router.patch("/products/:id", async (req, res) => {
  const { variants, ...fields } = req.body;
  const ref = db.collection("products").doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Product not found" });

  await ref.update({ ...fields, updated_at: FieldValue.serverTimestamp() });

  if (variants && Array.isArray(variants)) {
    const existingVariants = await ref.collection("variants").get();
    const batch = db.batch();
    for (const v of existingVariants.docs) batch.delete(v.ref);
    for (const v of variants) {
      const vRef = ref.collection("variants").doc();
      batch.set(vRef, { label: v.label, values: v.values });
    }
    await batch.commit();
  }

  const updated = await ref.get();
  const variantsSnap = await ref.collection("variants").get();
  const savedVariants = variantsSnap.docs.map(v => ({ id: v.id, ...v.data() }));
  return res.json({ id: updated.id, ...updated.data(), variants: savedVariants });
});

router.delete("/products/:id", async (req, res) => {
  const ref = db.collection("products").doc(req.params.id);
  const variantsSnap = await ref.collection("variants").get();
  const batch = db.batch();
  for (const v of variantsSnap.docs) batch.delete(v.ref);
  batch.delete(ref);
  await batch.commit();
  return res.status(204).send();
});

export default router;
