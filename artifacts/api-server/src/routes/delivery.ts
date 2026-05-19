import { Router } from "express";
import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  createOrder,
  createShipment,
  trackShipment,
  cancelOrder,
} from "../lib/shiprocket.js";

const router = Router();

/**
 * POST /api/delivery/create
 *
 * Body:
 * {
 *   orderId: string;           — Firestore order document ID
 *   shopId: string;            — Firestore store document ID
 *   pickupLocation: string;    — name of pickup address registered in Shiprocket dashboard
 *   customerDetails: {
 *     name: string;
 *     phone: string;
 *     email?: string;
 *     addressLine: string;
 *     city: string;
 *     state: string;
 *     pincode: string;
 *     country?: string;        — default "India"
 *   };
 *   orderDetails: {
 *     paymentMethod?: "Prepaid" | "COD";   — default "Prepaid"
 *     items: { name: string; sku?: string; units: number; price: number }[];
 *     subTotal: number;
 *     weight: number;          — kg
 *     length?: number;         — cm, default 10
 *     breadth?: number;        — cm, default 10
 *     height?: number;         — cm, default 10
 *   };
 * }
 *
 * Returns: { shiprocketOrderId, shipmentId, awbCode, courierName }
 */
router.post("/delivery/create", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;

  const {
    orderId,
    shopId,
    pickupLocation,
    customerDetails,
    orderDetails,
  } = req.body as {
    orderId: string;
    shopId: string;
    pickupLocation: string;
    customerDetails: {
      name: string;
      phone: string;
      email?: string;
      addressLine: string;
      city: string;
      state: string;
      pincode: string;
      country?: string;
    };
    orderDetails: {
      paymentMethod?: "Prepaid" | "COD";
      items: { name: string; sku?: string; units: number; price: number }[];
      subTotal: number;
      weight: number;
      length?: number;
      breadth?: number;
      height?: number;
    };
  };

  if (!orderId || !shopId || !pickupLocation || !customerDetails || !orderDetails) {
    return res.status(400).json({
      error: "orderId, shopId, pickupLocation, customerDetails and orderDetails are required",
    });
  }

  // Verify the store belongs to the authenticated user
  const storeSnap = await db.collection("stores").doc(shopId).get();
  if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
  const storeData = storeSnap.data() as any;
  if (storeData.owner_id && storeData.owner_id !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Fetch the order
  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });
  const orderData = orderSnap.data() as any;
  if (orderData.store_id !== shopId) {
    return res.status(403).json({ error: "Order does not belong to this store" });
  }
  if (orderData.shiprocket_shipment_id) {
    return res.status(409).json({
      error: "Shipment already created for this order",
      shipmentId: orderData.shiprocket_shipment_id,
      awbCode: orderData.shiprocket_awb_code ?? null,
    });
  }

  // Build Shiprocket order date string (YYYY-MM-DD HH:mm)
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [firstName, ...rest] = (customerDetails.name ?? "").trim().split(" ");
  const lastName = rest.join(" ") || ".";

  const srItems = orderDetails.items.map((item, idx) => ({
    name: item.name,
    sku: item.sku ?? `SKU-${idx + 1}`,
    units: item.units,
    selling_price: item.price,
  }));

  // Step 1: Create order on Shiprocket
  let srOrder;
  try {
    srOrder = await createOrder({
      order_id: orderId,
      order_date: orderDate,
      pickup_location: pickupLocation,
      billing_customer_name: firstName || "Customer",
      billing_last_name: lastName,
      billing_address: customerDetails.addressLine,
      billing_city: customerDetails.city,
      billing_pincode: customerDetails.pincode,
      billing_state: customerDetails.state,
      billing_country: customerDetails.country ?? "India",
      billing_email: customerDetails.email,
      billing_phone: customerDetails.phone,
      shipping_is_billing: true,
      order_items: srItems,
      payment_method: orderDetails.paymentMethod ?? "Prepaid",
      sub_total: orderDetails.subTotal,
      length: orderDetails.length ?? 10,
      breadth: orderDetails.breadth ?? 10,
      height: orderDetails.height ?? 10,
      weight: orderDetails.weight,
    });
  } catch (err: any) {
    return res.status(502).json({ error: "Failed to create Shiprocket order", detail: err.message });
  }

  const shiprocketOrderId: number = srOrder.order_id;
  const shipmentId: number = srOrder.shipment_id;

  // Step 2: Assign AWB (picks best courier automatically)
  let awbCode: string | null = null;
  let courierName: string | null = null;
  try {
    const awbRes = await createShipment(shipmentId);
    awbCode = awbRes?.response?.data?.awb_code ?? null;
    courierName = awbRes?.response?.data?.courier_name ?? null;
  } catch (err: any) {
    // Non-fatal — order is created, AWB can be assigned manually in dashboard
    console.warn("Shiprocket AWB assignment failed (non-fatal):", err.message);
  }

  // Save tracking info back to the order document
  await db.collection("orders").doc(orderId).update({
    shiprocket_order_id: shiprocketOrderId,
    shiprocket_shipment_id: shipmentId,
    shiprocket_awb_code: awbCode,
    shiprocket_courier_name: courierName,
    shiprocket_pickup_location: pickupLocation,
    shipping_status: "processing",
    updated_at: FieldValue.serverTimestamp(),
  });

  return res.status(201).json({
    shiprocketOrderId,
    shipmentId,
    awbCode,
    courierName,
  });
});

/**
 * GET /api/delivery/track?shipmentId=
 *
 * Proxies tracking info from Shiprocket.
 */
router.get("/delivery/track", async (req, res) => {
  const { shipmentId } = req.query as { shipmentId?: string };
  if (!shipmentId) {
    return res.status(400).json({ error: "shipmentId query parameter is required" });
  }

  try {
    const tracking = await trackShipment(shipmentId);
    return res.json(tracking);
  } catch (err: any) {
    return res.status(502).json({ error: "Failed to fetch tracking info", detail: err.message });
  }
});

/**
 * POST /api/delivery/cancel
 *
 * Body: { orderId: string }
 * Cancels the Shiprocket order linked to this Firestore order.
 */
router.post("/delivery/cancel", verifyToken, async (req, res) => {
  const uid = (req as any).uid as string;
  const { orderId } = req.body as { orderId?: string };

  if (!orderId) return res.status(400).json({ error: "orderId is required" });

  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });
  const orderData = orderSnap.data() as any;

  // Verify store ownership
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
    return res.status(502).json({ error: "Failed to cancel Shiprocket order", detail: err.message });
  }
});

export default router;
