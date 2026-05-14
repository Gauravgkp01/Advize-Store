import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Award one loyalty stamp to a customer after a successful order.
 * Called best-effort (non-blocking) from order creation routes.
 */
export async function awardLoyaltyStamp(storeId: string, phone: string | undefined): Promise<void> {
  if (!phone) return;
  const normalizedPhone = phone.replace(/\D/g, "");
  if (!normalizedPhone) return;

  const storeSnap = await db.collection("stores").doc(storeId).get();
  if (!storeSnap.exists) return;
  if (!storeSnap.data()!.loyalty_enabled) return;

  const cardId = `${storeId}_${normalizedPhone}`;
  const cardRef = db.collection("loyalty_cards").doc(cardId);

  await db.runTransaction(async (tx) => {
    const cardSnap = await tx.get(cardRef);
    if (cardSnap.exists) {
      tx.update(cardRef, {
        stamps: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(cardRef, {
        store_id: storeId,
        phone: normalizedPhone,
        stamps: 1,
        redeemed_count: 0,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    }
  });
}
