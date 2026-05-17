import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../lib/firebase";
import { verifyToken } from "../middlewares/verifyToken.js";
import { logger } from "../lib/logger";
import { cacheDeleteByPrefix } from "../lib/cache";

const router = Router();
const waLog = logger.child({ module: "wa-marketing" });
const WA_GRAPH = "https://graph.facebook.com/v21.0";

// ── Public config (App ID for FB SDK init) ─────────────────────────────────────
router.get("/wa/config", (_req, res) => {
  const app_id = process.env.META_APP_ID ?? "";
  return res.json({ app_id });
});

// ── Embedded Signup — exchange OAuth code for access token ────────────────────
router.post("/wa/embedded-signup", verifyToken, async (req, res) => {
  const { store_id, code } = req.body as { store_id?: string; code?: string };
  if (!store_id || !code) {
    return res.status(400).json({ error: "store_id and code required" });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return res.status(500).json({ error: "Meta App credentials not configured on the server" });
  }

  try {
    // 1. Exchange authorization code for access token
    const tokenRes = await fetch(
      `${WA_GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`,
    );
    const tokenData = (await tokenRes.json()) as any;
    if (!tokenRes.ok || tokenData.error) {
      return res.status(400).json({
        error: tokenData?.error?.message ?? "Failed to exchange authorization code",
      });
    }
    const access_token: string = tokenData.access_token;

    // 2. Get WhatsApp Business Accounts for this user
    const wabaRes = await fetch(
      `${WA_GRAPH}/me/whatsapp_business_accounts?access_token=${access_token}&fields=id,name`,
    );
    const wabaData = (await wabaRes.json()) as any;
    if (!wabaRes.ok || !wabaData.data?.length) {
      return res.status(400).json({
        error:
          "No WhatsApp Business Account found. Please complete the WhatsApp Business setup and try again.",
      });
    }
    const waba = wabaData.data[0] as { id: string; name: string };

    // 3. Get phone numbers registered in this WABA
    const phonesRes = await fetch(
      `${WA_GRAPH}/${waba.id}/phone_numbers?access_token=${access_token}&fields=id,display_phone_number,verified_name,quality_rating`,
    );
    const phonesData = (await phonesRes.json()) as any;
    if (!phonesRes.ok || !phonesData.data?.length) {
      return res.status(400).json({
        error: "No phone number registered in your WhatsApp Business Account.",
      });
    }
    const phone = phonesData.data[0] as {
      id: string;
      display_phone_number: string;
      verified_name: string;
      quality_rating: string;
    };

    // 4. Save everything to Firestore
    await db.collection("stores").doc(store_id).update({
      wa_phone_number_id: phone.id,
      wa_access_token: access_token,
      wa_business_phone: phone.display_phone_number.replace(/\D/g, ""),
      wa_display_name: phone.verified_name || waba.name || "",
      wa_waba_id: waba.id,
      wa_connected_at: Date.now(),
    });

    cacheDeleteByPrefix(`store:id:${store_id}`);
    waLog.info({ storeId: store_id, wabaId: waba.id }, "embedded-signup: WhatsApp connected");

    return res.json({
      ok: true,
      verified_name: phone.verified_name,
      display_phone: phone.display_phone_number,
      waba_name: waba.name,
    });
  } catch (err: any) {
    waLog.error({ err }, "embedded-signup: error");
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

// ── Connect WhatsApp Business (manual fallback) ───────────────────────────────
router.post("/wa/connect", verifyToken, async (req, res) => {
  const { store_id, phone_number_id, access_token, business_phone, display_name, waba_id } =
    req.body as {
      store_id?: string;
      phone_number_id?: string;
      access_token?: string;
      business_phone?: string;
      display_name?: string;
      waba_id?: string;
    };

  if (!store_id || !phone_number_id || !access_token || !business_phone) {
    return res.status(400).json({
      error: "store_id, phone_number_id, access_token and business_phone are required",
    });
  }

  try {
    const testRes = await fetch(
      `${WA_GRAPH}/${phone_number_id}?fields=display_phone_number,verified_name&access_token=${access_token}`,
    );
    const testData = (await testRes.json()) as any;

    if (!testRes.ok || testData.error) {
      return res.status(400).json({
        error: `Invalid credentials: ${testData?.error?.message ?? "Could not verify with WhatsApp API"}`,
      });
    }

    await db.collection("stores").doc(store_id).update({
      wa_phone_number_id: phone_number_id,
      wa_access_token: access_token,
      wa_business_phone: business_phone.replace(/\D/g, ""),
      wa_display_name: display_name || testData.verified_name || "",
      wa_waba_id: waba_id || "",
      wa_connected_at: Date.now(),
    });

    cacheDeleteByPrefix(`store:id:${store_id}`);
    waLog.info({ storeId: store_id, phoneNumberId: phone_number_id }, "connect: WhatsApp connected");

    return res.json({
      ok: true,
      verified_name: testData.verified_name,
      display_phone: testData.display_phone_number,
    });
  } catch (err: any) {
    waLog.error({ err }, "connect: error");
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
});

// ── Disconnect ────────────────────────────────────────────────────────────────
router.post("/wa/disconnect", verifyToken, async (req, res) => {
  const { store_id } = req.body as { store_id?: string };
  if (!store_id) return res.status(400).json({ error: "store_id required" });
  try {
    await db.collection("stores").doc(store_id).update({
      wa_phone_number_id: FieldValue.delete(),
      wa_access_token: FieldValue.delete(),
      wa_business_phone: FieldValue.delete(),
      wa_display_name: FieldValue.delete(),
      wa_waba_id: FieldValue.delete(),
      wa_connected_at: FieldValue.delete(),
    });
    cacheDeleteByPrefix(`store:id:${store_id}`);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Test connection ───────────────────────────────────────────────────────────
router.post("/wa/test", verifyToken, async (req, res) => {
  const { store_id } = req.body as { store_id?: string };
  if (!store_id) return res.status(400).json({ error: "store_id required" });
  try {
    const storeSnap = await db.collection("stores").doc(store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const store = storeSnap.data()!;

    const phoneNumberId: string = store.wa_phone_number_id ?? "";
    const accessToken: string = store.wa_access_token ?? "";

    if (!phoneNumberId || !accessToken) {
      return res.json({ ok: false, error: "WhatsApp not connected" });
    }

    const testRes = await fetch(
      `${WA_GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating&access_token=${accessToken}`,
    );
    const testData = (await testRes.json()) as any;

    if (!testRes.ok || testData.error) {
      return res.json({ ok: false, error: testData?.error?.message ?? "API verification failed" });
    }

    return res.json({
      ok: true,
      display_phone_number: testData.display_phone_number,
      verified_name: testData.verified_name,
      quality_rating: testData.quality_rating,
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Contacts: list ────────────────────────────────────────────────────────────
router.get("/wa/contacts/:storeId", verifyToken, async (req, res) => {
  const { storeId } = req.params;
  try {
    const snap = await db
      .collection("wa_contacts")
      .where("store_id", "==", storeId)
      .orderBy("joined_at", "desc")
      .limit(500)
      .get();
    const contacts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ contacts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Contacts: opt-in (public — called from storefront) ────────────────────────
router.post("/wa/optin", async (req, res) => {
  const { store_id, phone, name } = req.body as {
    store_id?: string;
    phone?: string;
    name?: string;
  };
  if (!store_id || !phone) return res.status(400).json({ error: "store_id and phone required" });

  const normalizedPhone = phone.replace(/\D/g, "");
  const docId = `${store_id}_${normalizedPhone}`;

  try {
    const existing = await db.collection("wa_contacts").doc(docId).get();
    if (existing.exists && existing.data()?.opted_in) {
      return res.json({ ok: true, already: true });
    }

    await db.collection("wa_contacts").doc(docId).set(
      {
        store_id,
        phone: normalizedPhone,
        name: (name ?? "").trim(),
        opted_in: true,
        tags: [],
        joined_at: Date.now(),
        last_order_at: null,
        total_orders: 0,
      },
      { merge: true },
    );

    return res.json({ ok: true, already: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Contacts: opt-out ─────────────────────────────────────────────────────────
router.post("/wa/optout", async (req, res) => {
  const { store_id, phone } = req.body as { store_id?: string; phone?: string };
  if (!store_id || !phone) return res.status(400).json({ error: "store_id and phone required" });
  const docId = `${store_id}_${phone.replace(/\D/g, "")}`;
  try {
    await db.collection("wa_contacts").doc(docId).update({ opted_in: false });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Templates: list ───────────────────────────────────────────────────────────
router.get("/wa/templates/:storeId", verifyToken, async (req, res) => {
  const { storeId } = req.params;
  try {
    const snap = await db
      .collection("wa_templates")
      .where("store_id", "==", storeId)
      .orderBy("created_at", "desc")
      .get();
    return res.json({ templates: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Templates: create ─────────────────────────────────────────────────────────
router.post("/wa/templates", verifyToken, async (req, res) => {
  const { store_id, name, body, category } = req.body as {
    store_id?: string;
    name?: string;
    body?: string;
    category?: string;
  };
  if (!store_id || !name || !body)
    return res.status(400).json({ error: "store_id, name and body required" });
  try {
    const ref = await db.collection("wa_templates").add({
      store_id,
      name: name.trim(),
      body: body.trim(),
      category: category || "MARKETING",
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    const doc = await ref.get();
    return res.json({ id: ref.id, ...doc.data() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Templates: update ─────────────────────────────────────────────────────────
router.patch("/wa/templates/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, body, category } = req.body as {
    name?: string;
    body?: string;
    category?: string;
  };
  try {
    const update: Record<string, unknown> = { updated_at: Date.now() };
    if (name !== undefined) update.name = name.trim();
    if (body !== undefined) update.body = body.trim();
    if (category !== undefined) update.category = category;
    await db.collection("wa_templates").doc(id).update(update);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Templates: delete ─────────────────────────────────────────────────────────
router.delete("/wa/templates/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection("wa_templates").doc(id).delete();
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Campaigns: list ───────────────────────────────────────────────────────────
router.get("/wa/campaigns/:storeId", verifyToken, async (req, res) => {
  const { storeId } = req.params;
  try {
    const snap = await db
      .collection("wa_campaigns")
      .where("store_id", "==", storeId)
      .orderBy("created_at", "desc")
      .limit(100)
      .get();
    return res.json({ campaigns: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Campaigns: create ─────────────────────────────────────────────────────────
router.post("/wa/campaigns", verifyToken, async (req, res) => {
  const { store_id, name, message, audience_filter, scheduled_at } = req.body as {
    store_id?: string;
    name?: string;
    message?: string;
    audience_filter?: string;
    scheduled_at?: number | null;
  };
  if (!store_id || !name || !message)
    return res.status(400).json({ error: "store_id, name and message required" });
  try {
    const ref = await db.collection("wa_campaigns").add({
      store_id,
      name: name.trim(),
      message: message.trim(),
      audience_filter: audience_filter || "all",
      scheduled_at: scheduled_at ?? null,
      status: scheduled_at ? "scheduled" : "draft",
      stats: { total: 0, sent: 0, delivered: 0, failed: 0, read: 0 },
      created_at: Date.now(),
      updated_at: Date.now(),
      sent_at: null,
    });
    const doc = await ref.get();
    return res.json({ id: ref.id, ...doc.data() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Campaigns: update ─────────────────────────────────────────────────────────
router.patch("/wa/campaigns/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, message, audience_filter, scheduled_at } = req.body as {
    name?: string;
    message?: string;
    audience_filter?: string;
    scheduled_at?: number | null;
  };
  try {
    const update: Record<string, unknown> = { updated_at: Date.now() };
    if (name !== undefined) update.name = name.trim();
    if (message !== undefined) update.message = message.trim();
    if (audience_filter !== undefined) update.audience_filter = audience_filter;
    if (scheduled_at !== undefined) update.scheduled_at = scheduled_at;
    await db.collection("wa_campaigns").doc(id).update(update);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Campaigns: delete ─────────────────────────────────────────────────────────
router.delete("/wa/campaigns/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection("wa_campaigns").doc(id).delete();
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Campaigns: broadcast / send ───────────────────────────────────────────────
router.post("/wa/campaigns/:id/send", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const campaignSnap = await db.collection("wa_campaigns").doc(id).get();
    if (!campaignSnap.exists) return res.status(404).json({ error: "Campaign not found" });
    const campaign = campaignSnap.data()!;

    if (campaign.status === "sending" || campaign.status === "sent") {
      return res.status(400).json({ error: `Campaign already ${campaign.status}` });
    }

    const storeSnap = await db.collection("stores").doc(campaign.store_id).get();
    if (!storeSnap.exists) return res.status(404).json({ error: "Store not found" });
    const store = storeSnap.data()!;

    if (!store.wa_phone_number_id || !store.wa_access_token) {
      return res.status(400).json({ error: "WhatsApp not connected for this store" });
    }

    // Build audience query
    let contactsQuery = db
      .collection("wa_contacts")
      .where("store_id", "==", campaign.store_id)
      .where("opted_in", "==", true);

    const snap = await contactsQuery.limit(1000).get();
    let contacts = snap.docs.map((d) => d.data() as { phone: string; total_orders?: number; joined_at?: number });

    if (campaign.audience_filter === "buyers") {
      contacts = contacts.filter((c) => (c.total_orders ?? 0) > 0);
    } else if (campaign.audience_filter === "new") {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      contacts = contacts.filter((c) => (c.joined_at ?? 0) >= cutoff);
    }

    if (contacts.length === 0) {
      return res.status(400).json({ error: "No opted-in contacts match this audience" });
    }

    await db.collection("wa_campaigns").doc(id).update({
      status: "sending",
      sent_at: Date.now(),
      "stats.total": contacts.length,
    });

    // Respond immediately — send in background
    res.json({ ok: true, total: contacts.length, message: "Broadcast started" });

    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const BATCH = 10;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < contacts.length; i += BATCH) {
      const batch = contacts.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (contact) => {
          const msgRes = await fetch(
            `${WA_GRAPH}/${store.wa_phone_number_id}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${store.wa_access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: contact.phone,
                type: "text",
                text: { body: campaign.message, preview_url: false },
              }),
            },
          );
          const data = (await msgRes.json()) as any;
          if (!msgRes.ok || data.error)
            throw new Error(data?.error?.message ?? "Send failed");
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled") sent++;
        else failed++;
      }

      if (i + BATCH < contacts.length) await delay(600);
    }

    await db.collection("wa_campaigns").doc(id).update({
      status: failed === contacts.length ? "failed" : "sent",
      "stats.sent": sent,
      "stats.failed": failed,
    });

    waLog.info({ campaignId: id, total: contacts.length, sent, failed }, "broadcast: complete");
  } catch (err: any) {
    waLog.error({ err, campaignId: id }, "broadcast: error");
    await db
      .collection("wa_campaigns")
      .doc(id)
      .update({ status: "failed" })
      .catch(() => {});
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get("/wa/analytics/:storeId", verifyToken, async (req, res) => {
  const { storeId } = req.params;
  try {
    const [campaignsSnap, contactsSnap] = await Promise.all([
      db
        .collection("wa_campaigns")
        .where("store_id", "==", storeId)
        .orderBy("created_at", "desc")
        .limit(20)
        .get(),
      db
        .collection("wa_contacts")
        .where("store_id", "==", storeId)
        .where("opted_in", "==", true)
        .get(),
    ]);

    const campaigns = campaignsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const totalContacts = contactsSnap.size;
    const totalSent = campaigns.reduce((s, c) => s + (c.stats?.sent ?? 0), 0);
    const totalFailed = campaigns.reduce((s, c) => s + (c.stats?.failed ?? 0), 0);

    return res.json({
      total_contacts: totalContacts,
      total_campaigns: campaigns.length,
      total_sent: totalSent,
      total_failed: totalFailed,
      delivery_rate: totalSent > 0 ? Math.round(((totalSent - totalFailed) / totalSent) * 100) : 0,
      recent_campaigns: campaigns.slice(0, 10),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Webhook: verification + delivery receipts ─────────────────────────────────
const WA_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN ?? "advize_wa_verify";

router.get("/wa/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === WA_VERIFY_TOKEN) {
    return res.status(200).send(challenge as string);
  }
  return res.sendStatus(403);
});

router.post("/wa/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body as any;
    if (body.object !== "whatsapp_business_account") return;
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const status of change.value?.statuses ?? []) {
          waLog.info({ msgId: status.id, status: status.status }, "webhook: delivery status");
        }
      }
    }
  } catch (err: any) {
    waLog.error({ err }, "webhook: error");
  }
});

export default router;
