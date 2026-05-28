import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

function docId(storeId: string, code: string) {
  return `${storeId}_${code.toUpperCase().replace(/\s/g, "")}`;
}

/** POST /coupons — create a coupon (merchant auth) */
router.post("/coupons", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { store_id, code, type, value, description, max_uses } = req.body as {
    store_id: string; code: string; type: "percent" | "fixed";
    value: number; description?: string; max_uses?: number | null;
  };

  if (!store_id || !code?.trim() || !type || value == null) {
    return res.status(400).json({ error: "store_id, code, type, and value are required" });
  }
  if (type === "percent" && (value <= 0 || value > 100)) {
    return res.status(400).json({ error: "Percentage must be between 1 and 100" });
  }
  if (type === "fixed" && value <= 0) {
    return res.status(400).json({ error: "Discount amount must be greater than 0" });
  }

  const storeSnap = await db.collection("stores").doc(store_id).get();
  if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
  if ((storeSnap.data() as any).owner_id !== uid) return res.status(403).json({ error: "Forbidden" });

  const normalizedCode = code.toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z0-9_-]{2,20}$/.test(normalizedCode)) {
    return res.status(400).json({ error: "Code must be 2–20 characters (letters, numbers, _ or -)" });
  }

  const id = docId(store_id, normalizedCode);
  const existing = await db.collection("coupon_codes").doc(id).get();
  if (existing.exists) return res.status(409).json({ error: "This coupon code already exists" });

  await db.collection("coupon_codes").doc(id).set({
    store_id,
    code: normalizedCode,
    type,
    value,
    description: description?.trim() ?? "",
    max_uses: max_uses ?? null,
    uses: 0,
    active: true,
    created_at: FieldValue.serverTimestamp(),
  });

  return res.status(201).json({ code: normalizedCode });
});

/** GET /coupons/:storeId — list coupons for a store (merchant auth) */
router.get("/coupons/:storeId", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { storeId } = req.params;

  const storeSnap = await db.collection("stores").doc(storeId).get();
  if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
  if ((storeSnap.data() as any).owner_id !== uid) return res.status(403).json({ error: "Forbidden" });

  const snap = await db.collection("coupon_codes")
    .where("store_id", "==", storeId)
    .get();

  const coupons = snap.docs
    .map(d => {
      const data = d.data();
      return {
        code: data.code,
        type: data.type,
        value: data.value,
        description: data.description,
        max_uses: data.max_uses ?? null,
        uses: data.uses ?? 0,
        active: data.active ?? true,
        created_at: data.created_at?.toMillis?.() ?? 0,
      };
    })
    .sort((a, b) => b.created_at - a.created_at)
    .map(({ created_at: _ts, ...rest }) => rest);

  return res.json(coupons);
});

/** DELETE /coupons/:storeId/:code — delete a coupon (merchant auth) */
router.delete("/coupons/:storeId/:code", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { storeId, code } = req.params;

  const storeSnap = await db.collection("stores").doc(storeId).get();
  if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
  if ((storeSnap.data() as any).owner_id !== uid) return res.status(403).json({ error: "Forbidden" });

  await db.collection("coupon_codes").doc(docId(storeId, code)).delete();
  return res.json({ ok: true });
});

/** POST /coupons/validate — validate a coupon code (public)
 *  Body: { store_id, code, subtotal_paise }
 */
router.post("/coupons/validate", async (req, res) => {
  const { store_id, code, subtotal_paise } = req.body as {
    store_id: string; code: string; subtotal_paise?: number;
  };
  if (!store_id || !code) {
    return res.status(400).json({ error: "store_id and code are required" });
  }

  try {
    const snap = await db.collection("coupon_codes").doc(docId(store_id, code)).get();
    if (!snap.exists) return res.json({ valid: false, error: "Invalid coupon code" });

    const data = snap.data()!;
    if (!data.active) return res.json({ valid: false, error: "This coupon is no longer active" });
    if (data.max_uses != null && data.uses >= data.max_uses) {
      return res.json({ valid: false, error: "Coupon usage limit reached" });
    }

    const subtotalRupees = (subtotal_paise ?? 0) / 100;
    let discount = 0;
    if (data.type === "percent") {
      discount = Math.round((subtotalRupees * data.value) / 100 * 100) / 100;
    } else {
      discount = Math.min(data.value, subtotalRupees);
    }

    return res.json({
      valid: true,
      code: data.code,
      type: data.type,
      value: data.value,
      description: data.description,
      discount_rupees: discount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

/** GET /coupons/public/:storeId — active coupons shown on public storefront (no auth) */
router.get("/coupons/public/:storeId", async (req, res) => {
  const { storeId } = req.params;
  try {
    const snap = await db.collection("coupon_codes")
      .where("store_id", "==", storeId)
      .where("active", "==", true)
      .get();
    const coupons = snap.docs.map(d => {
      const data = d.data();
      return {
        code: data.code as string,
        type: data.type as "percent" | "fixed",
        value: data.value as number,
        description: (data.description as string) ?? "",
      };
    });
    return res.json(coupons);
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

export default router;
