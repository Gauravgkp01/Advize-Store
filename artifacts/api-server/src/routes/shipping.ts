import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  createOrder,
  createShipment,
  trackShipment,
  trackByAwb,
  cancelOrder,
  generateLabel,
  generateInvoice,
  schedulePickup,
} from "../lib/shiprocket.js";

const router = Router();

/* ────────────────────────────────────────────────────────────
 * POST /api/shipping/create
 * Create a Shiprocket order + auto-assign AWB for a paid order.
 * ────────────────────────────────────────────────────────────*/
router.post("/shipping/create", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { orderId, shopId, pickupLocation } = req.body as {
    orderId?: string;
    shopId?: string;
    pickupLocation?: string;
  };

  if (!orderId || !shopId || !pickupLocation) {
    return res.status(400).json({ error: "orderId, shopId and pickupLocation are required" });
  }

  const storeSnap = await db.collection("stores").doc(shopId).get();
  if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
  const storeData = storeSnap.data() as any;
  if (storeData.owner_id && storeData.owner_id !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });
  const orderData = orderSnap.data() as any;
  if (orderData.store_id !== shopId) return res.status(403).json({ error: "Order does not belong to this store" });
  if (orderData.shiprocket_shipment_id) {
    return res.status(409).json({
      error: "Shipment already created",
      shipmentId: orderData.shiprocket_shipment_id,
      awbCode: orderData.shiprocket_awb_code ?? null,
    });
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const buyer = orderData.buyer ?? {};
  const [firstName, ...rest] = (buyer.name ?? "Customer").trim().split(" ");
  const lastName = rest.join(" ") || ".";

  const items = (orderData.items ?? []).map((item: any, idx: number) => ({
    name: item.name ?? "Item",
    sku: item.productId ?? `SKU-${idx + 1}`,
    units: item.quantity ?? 1,
    selling_price: item.price ?? 0,
  }));

  const subTotal = Math.round((orderData.amount_paise ?? 0) / 100);

  const phone = (buyer.phone ?? "").replace(/\D/g, "");
  const pincode = (buyer.pincode ?? "").replace(/\D/g, "");

  // Hard-require only the fields Shiprocket truly needs; state falls back to "India"
  const missingFields: string[] = [];
  if (!buyer.addressLine?.trim()) missingFields.push("address");
  if (!buyer.city?.trim()) missingFields.push("city");
  if (pincode.length !== 6) missingFields.push("6-digit pincode");
  if (phone.length < 10) missingFields.push("10-digit phone");

  if (missingFields.length > 0) {
    return res.status(422).json({
      error: "Buyer address incomplete — cannot create shipment",
      missing: missingFields,
      hint: "The customer must provide complete shipping details: address, city, 6-digit pincode, and phone number.",
    });
  }

  const payload = {
    order_id: orderId,
    order_date: orderDate,
    pickup_location: pickupLocation,
    billing_customer_name: firstName || "Customer",
    billing_last_name: lastName,
    billing_address: buyer.addressLine.trim(),
    billing_city: buyer.city.trim(),
    billing_pincode: pincode,
    billing_state: (buyer.state ?? "").trim() || "India",
    billing_country: (buyer.country ?? "").trim() || "India",
    billing_email: buyer.email ?? undefined,
    billing_phone: phone.slice(-10),
    shipping_is_billing: true,
    order_items: items,
    payment_method: "Prepaid" as const,
    sub_total: subTotal,
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5,
  };

  console.info("Shiprocket createOrder payload: order_id=%s channel_id=%s", payload.order_id, payload.channel_id);

  let srOrder;
  try {
    srOrder = await createOrder(payload);
  } catch (err: any) {
    console.error("Shiprocket createOrder error:", err.message);
    return res.status(502).json({
      error: "Failed to create Shiprocket order",
      detail: err.message,
      hint: "Check that the pickup_location name exactly matches your Shiprocket panel, and that the buyer address fields are complete.",
    });
  }

  const shiprocketOrderId: number = srOrder.order_id;
  const shipmentId: number = srOrder.shipment_id;

  let awbCode: string | null = null;
  let courierName: string | null = null;
  try {
    const awbRes = await createShipment(shipmentId);
    awbCode = awbRes?.response?.data?.awb_code ?? null;
    courierName = awbRes?.response?.data?.courier_name ?? null;
  } catch (err: any) {
    console.warn("AWB assignment failed (non-fatal):", err.message);
  }

  await db.collection("orders").doc(orderId).update({
    shiprocket_order_id: shiprocketOrderId,
    shiprocket_shipment_id: shipmentId,
    shiprocket_awb_code: awbCode,
    shiprocket_courier_name: courierName,
    shiprocket_pickup_location: pickupLocation,
    shipping_status: "processing",
    updated_at: FieldValue.serverTimestamp(),
  });

  return res.status(201).json({ shiprocketOrderId, shipmentId, awbCode, courierName });
});

/* ────────────────────────────────────────────────────────────
 * GET /api/shipping/track?shipmentId=&awb=
 * ────────────────────────────────────────────────────────────*/
router.get("/shipping/track", async (req, res) => {
  const { shipmentId, awb } = req.query as { shipmentId?: string; awb?: string };
  try {
    if (awb) {
      const data = await trackByAwb(awb);
      return res.json(data);
    }
    if (shipmentId) {
      const data = await trackShipment(shipmentId);
      return res.json(data);
    }
    return res.status(400).json({ error: "shipmentId or awb query parameter is required" });
  } catch (err: any) {
    return res.status(502).json({ error: "Failed to fetch tracking info", detail: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
 * POST /api/shipping/cancel
 * Body: { orderId: string }
 * ────────────────────────────────────────────────────────────*/
router.post("/shipping/cancel", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { orderId } = req.body as { orderId?: string };
  if (!orderId) return res.status(400).json({ error: "orderId is required" });

  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });
  const orderData = orderSnap.data() as any;

  const storeSnap = await db.collection("stores").doc(orderData.store_id).get();
  if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
  const storeData = storeSnap.data() as any;
  if (storeData.owner_id && storeData.owner_id !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const shiprocketOrderId: number | undefined = orderData.shiprocket_order_id;
  if (!shiprocketOrderId) {
    return res.status(400).json({ error: "No Shiprocket order linked to this order" });
  }

  try {
    const result = await cancelOrder([shiprocketOrderId]);
    await db.collection("orders").doc(orderId).update({
      shipping_status: "cancelled",
      updated_at: FieldValue.serverTimestamp(),
    });
    return res.json({ ok: true, shiprocket: result });
  } catch (err: any) {
    return res.status(502).json({ error: "Failed to cancel shipment", detail: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
 * GET /api/shipping/label?orderId=
 * Returns the Shiprocket label URL for an order.
 * ────────────────────────────────────────────────────────────*/
router.get("/shipping/label", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { orderId } = req.query as { orderId?: string };
  if (!orderId) return res.status(400).json({ error: "orderId is required" });

  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });
  const orderData = orderSnap.data() as any;

  const storeSnap = await db.collection("stores").doc(orderData.store_id).get();
  if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
  const storeData = storeSnap.data() as any;
  if (storeData.owner_id && storeData.owner_id !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const shipmentId: number | undefined = orderData.shiprocket_shipment_id;
  if (!shipmentId) {
    return res.status(400).json({ error: "No shipment linked to this order" });
  }

  try {
    const labelRes = await generateLabel([shipmentId]);
    return res.json({ label_url: labelRes.label_url ?? null, raw: labelRes });
  } catch (err: any) {
    return res.status(502).json({ error: "Failed to generate label", detail: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
 * GET /api/shipping/invoice?orderId=
 * ────────────────────────────────────────────────────────────*/
router.get("/shipping/invoice", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { orderId } = req.query as { orderId?: string };
  if (!orderId) return res.status(400).json({ error: "orderId is required" });

  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });
  const orderData = orderSnap.data() as any;

  const storeSnap = await db.collection("stores").doc(orderData.store_id).get();
  if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
  const storeData = storeSnap.data() as any;
  if (storeData.owner_id && storeData.owner_id !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const srOrderId: number | undefined = orderData.shiprocket_order_id;
  if (!srOrderId) return res.status(400).json({ error: "No Shiprocket order linked" });

  try {
    const result = await generateInvoice([srOrderId]);
    return res.json(result);
  } catch (err: any) {
    return res.status(502).json({ error: "Failed to generate invoice", detail: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
 * POST /api/shipping/pickup
 * Body: { orderId: string }
 * Schedule a pickup for an existing shipment.
 * ────────────────────────────────────────────────────────────*/
router.post("/shipping/pickup", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { orderId } = req.body as { orderId?: string };
  if (!orderId) return res.status(400).json({ error: "orderId is required" });

  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });
  const orderData = orderSnap.data() as any;

  const storeSnap = await db.collection("stores").doc(orderData.store_id).get();
  if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
  const storeData = storeSnap.data() as any;
  if (storeData.owner_id && storeData.owner_id !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const shipmentId: number | undefined = orderData.shiprocket_shipment_id;
  if (!shipmentId) return res.status(400).json({ error: "No shipment linked to this order" });

  try {
    const result = await schedulePickup([shipmentId]);
    return res.json({ ok: true, shiprocket: result });
  } catch (err: any) {
    return res.status(502).json({ error: "Failed to schedule pickup", detail: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
 * POST /api/shiprocket-webhook
 * Receives status updates from Shiprocket.
 * ────────────────────────────────────────────────────────────*/
router.post("/shiprocket-webhook", async (req, res) => {
  try {
    const body = req.body as any;
    const awb: string | undefined = body?.awb;
    const srStatus: string | undefined = body?.current_status;
    const srOrderId: number | string | undefined = body?.order_id;

    if (!awb && !srOrderId) {
      return res.status(400).json({ error: "awb or order_id required" });
    }

    let orderSnap: FirebaseFirestore.QuerySnapshot | null = null;

    if (awb) {
      orderSnap = await db.collection("orders")
        .where("shiprocket_awb_code", "==", awb)
        .limit(1)
        .get();
    } else if (srOrderId) {
      const id = typeof srOrderId === "string" ? parseInt(srOrderId, 10) : srOrderId;
      orderSnap = await db.collection("orders")
        .where("shiprocket_order_id", "==", id)
        .limit(1)
        .get();
    }

    if (!orderSnap || orderSnap.empty) {
      console.warn("Shiprocket webhook: order not found for awb/order_id", { awb, srOrderId });
      return res.json({ ok: true, note: "order not found, ignored" });
    }

    const orderRef = orderSnap.docs[0].ref;

    const statusMap: Record<string, string> = {
      "PICKED UP": "out_for_delivery",
      "IN TRANSIT": "out_for_delivery",
      "OUT FOR DELIVERY": "out_for_delivery",
      "DELIVERED": "delivered",
      "CANCELLED": "cancelled",
      "RTO": "cancelled",
      "RTO INITIATED": "cancelled",
      "SHIPMENT CREATED": "processing",
    };

    const updates: Record<string, any> = {
      updated_at: FieldValue.serverTimestamp(),
    };

    if (srStatus) {
      const normalized = srStatus.toUpperCase().trim();
      updates.shipping_status = statusMap[normalized] ?? normalized.toLowerCase();

      // Mirror into order status when appropriate
      if (normalized === "DELIVERED") updates.status = "delivered";
      if (normalized === "CANCELLED" || normalized === "RTO") updates.status = "cancelled";
      if (normalized === "OUT FOR DELIVERY") updates.status = "out_for_delivery";
    }

    if (body?.etd) updates.shipping_etd = body.etd;

    await orderRef.update(updates);

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("Shiprocket webhook error:", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
