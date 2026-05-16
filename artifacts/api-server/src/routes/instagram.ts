import { Router } from "express";
import { db } from "../lib/firebase.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { cacheDeleteByPrefix } from "../lib/cache.js";

const router = Router();

const META_APP_ID = process.env.META_APP_ID ?? "";
const META_APP_SECRET = process.env.META_APP_SECRET ?? "";
const META_VERIFY_TOKEN =
  process.env.META_VERIFY_TOKEN ?? "advize_ig_verify_2025";
const BASE_URL = process.env.STORE_BASE_URL ?? "https://store.advize.in";
const CALLBACK_URL = `${BASE_URL}/api/instagram/callback`;
const IG_GRAPH = "https://graph.instagram.com/v21.0";

// ── Webhook verification (Meta calls GET to confirm endpoint) ────────────────
router.get("/instagram/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: "Verification failed" });
});

// ── Incoming DM webhook (Meta POSTs here for every event) ───────────────────
router.post("/instagram/webhook", async (req, res) => {
  res.status(200).json({ ok: true }); // respond immediately — Meta requires < 20 s
  try {
    const body = req.body as any;
    if (body?.object !== "instagram") {
      console.log("[Instagram webhook] Ignored non-instagram object:", body?.object);
      return;
    }

    for (const entry of body.entry ?? []) {
      const igUserId: string = entry.id;

      // Collect messaging events — Instagram may send via entry.messaging OR entry.changes[].value
      const messagingEvents: any[] = [];
      if (Array.isArray(entry.messaging)) {
        messagingEvents.push(...entry.messaging);
      }
      if (Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === "messages" && change.value) {
            messagingEvents.push(change.value);
          }
        }
      }

      for (const event of messagingEvents) {
        const senderIgsid: string = event.sender?.id;
        const text: string | undefined = event.message?.text;

        // Skip echo events (messages sent by the page itself)
        if (!senderIgsid || !text || event.message?.is_echo) continue;

        console.log(`[Instagram webhook] Message from ${senderIgsid} to ig_user_id ${igUserId}: "${text}"`);

        // Find the store that owns this Instagram account
        const storeSnap = await db
          .collection("stores")
          .where("ig_user_id", "==", igUserId)
          .limit(1)
          .get();
        if (storeSnap.empty) {
          console.log(`[Instagram webhook] No store found for ig_user_id: ${igUserId}`);
          continue;
        }

        const storeDoc = storeSnap.docs[0];
        const storeData = storeDoc.data();
        const accessToken: string = storeData.ig_access_token;
        if (!accessToken) {
          console.log(`[Instagram webhook] No access token for store: ${storeDoc.id}`);
          continue;
        }

        // Load enabled rules for this store
        const rulesSnap = await db
          .collection("instagram_rules")
          .where("store_id", "==", storeDoc.id)
          .where("enabled", "==", true)
          .get();
        if (rulesSnap.empty) {
          console.log(`[Instagram webhook] No enabled rules for store: ${storeDoc.id}`);
          continue;
        }

        const lower = text.toLowerCase().trim();
        let matchedReply: string | null = null;

        for (const ruleDoc of rulesSnap.docs) {
          const rule = ruleDoc.data();
          const kw = (rule.keyword as string).toLowerCase().trim();
          const mt = rule.match_type as string;
          if (
            (mt === "exact" && lower === kw) ||
            (mt === "contains" && lower.includes(kw)) ||
            (mt === "starts_with" && lower.startsWith(kw))
          ) {
            matchedReply = rule.reply as string;
            console.log(`[Instagram webhook] Rule matched (${mt} "${kw}") → replying to ${senderIgsid}`);
            break; // first match wins
          }
        }
        if (!matchedReply) {
          console.log(`[Instagram webhook] No rule matched for text: "${lower}"`);
          continue;
        }

        // Send the automated reply via Instagram Graph API
        const sendRes = await fetch(`${IG_GRAPH}/me/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: { id: senderIgsid },
            message: { text: matchedReply },
            messaging_product: "instagram",
          }),
        });
        const sendData = await sendRes.json() as any;
        if (!sendRes.ok) {
          console.error(`[Instagram webhook] Send DM failed (${sendRes.status}):`, JSON.stringify(sendData));
        } else {
          console.log(`[Instagram webhook] DM sent successfully, message_id: ${sendData.message_id}`);
        }
      }
    }
  } catch (err) {
    console.error("[Instagram webhook]", err);
  }
});

// ── OAuth: redirect merchant to Instagram authorization page ─────────────────
router.get("/instagram/connect", (req, res) => {
  const storeId = req.query.store_id as string;
  if (!storeId) return res.status(400).json({ error: "store_id required" });
  if (!META_APP_ID)
    return res
      .status(500)
      .json({ error: "Meta App not configured — set META_APP_ID" });

  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: CALLBACK_URL,
    scope: "instagram_business_basic,instagram_business_manage_messages",
    response_type: "code",
    state: storeId,
    force_reauth: "true",
  });
  return res.redirect(`https://www.instagram.com/oauth/authorize?${params}`);
});

// ── OAuth callback: exchange code → token, save to Firestore ─────────────────
router.get("/instagram/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  const storeId = req.query.state as string | undefined;
  const errParam = req.query.error as string | undefined;
  const dashboard = `${BASE_URL}/dashboard?tab=3`;

  if (errParam) {
    return res.redirect(
      `${dashboard}&ig_error=${encodeURIComponent(errParam)}`,
    );
  }
  if (!code || !storeId) {
    return res.redirect(`${dashboard}&ig_error=missing_params`);
  }

  try {
    // Step 1 — short-lived token
    const shortRes = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: CALLBACK_URL,
          code,
        }),
      },
    );
    const shortData = (await shortRes.json()) as any;
    if (!shortData.access_token) {
      throw new Error(
        shortData.error_message ??
          shortData.error?.message ??
          "Token exchange failed",
      );
    }

    // Step 2 — exchange for long-lived token (valid ~60 days)
    const longParams = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: META_APP_SECRET,
      access_token: shortData.access_token,
    });
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?${longParams}`,
    );
    const longData = (await longRes.json()) as any;
    const longToken: string = longData.access_token ?? shortData.access_token;
    const expiresIn: number = longData.expires_in ?? 5_184_000;

    // Step 3 — get user info
    let finalUserId = shortData.user_id?.toString() ?? "";
    let finalUsername = shortData.username ?? "";

    if (!finalUserId) {
      const userRes = await fetch(
        `${IG_GRAPH}/me?fields=id,username&access_token=${longToken}`,
      );
      const userData = (await userRes.json()) as any;
      console.log("[Instagram user data]", userData);
      finalUserId = userData.id?.toString() ?? "";
      finalUsername = userData.username ?? "";
    }

    if (!finalUserId) {
      throw new Error("Could not retrieve Instagram user ID");
    }

    // Step 4 — persist to Firestore
    await db
      .collection("stores")
      .doc(storeId)
      .update({
        ig_user_id: finalUserId,
        ig_username: finalUsername,
        ig_access_token: longToken,
        ig_token_expires_at: Date.now() + expiresIn * 1000,
      });
    cacheDeleteByPrefix(`store:id:${storeId}`);
    return res.redirect(`${dashboard}&ig_connected=1`);
  } catch (err: any) {
    console.error("[Instagram callback]", err);
    return res.redirect(
      `${dashboard}&ig_error=${encodeURIComponent(err.message ?? "unknown")}`,
    );
  }
});

// ── Disconnect Instagram from a store ────────────────────────────────────────
router.post("/instagram/disconnect", verifyToken, async (req, res) => {
  const { store_id } = req.body;
  if (!store_id) return res.status(400).json({ error: "store_id required" });

  await db.collection("stores").doc(store_id).update({
    ig_user_id: null,
    ig_username: null,
    ig_access_token: null,
    ig_token_expires_at: null,
  });
  cacheDeleteByPrefix(`store:id:${store_id}`);
  res.json({ ok: true });
});

// ── List keyword rules for a store ──────────────────────────────────────────
router.get("/instagram/rules/:storeId", verifyToken, async (req, res) => {
  const { storeId } = req.params;
  const snap = await db
    .collection("instagram_rules")
    .where("store_id", "==", storeId)
    .orderBy("created_at", "asc")
    .get();
  const rules = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ rules });
});

// ── Create a rule ────────────────────────────────────────────────────────────
router.post("/instagram/rules/:storeId", verifyToken, async (req, res) => {
  const { storeId } = req.params;
  const { keyword, match_type, reply, enabled } = req.body;
  if (!keyword?.trim() || !match_type || !reply?.trim()) {
    return res
      .status(400)
      .json({ error: "keyword, match_type, and reply are required" });
  }
  const ref = await db.collection("instagram_rules").add({
    store_id: storeId,
    keyword: (keyword as string).trim(),
    match_type,
    reply: (reply as string).trim(),
    enabled: enabled !== false,
    created_at: new Date(),
  });
  res.status(201).json({
    id: ref.id,
    store_id: storeId,
    keyword: (keyword as string).trim(),
    match_type,
    reply: (reply as string).trim(),
    enabled: enabled !== false,
  });
});

// ── Update a rule (partial) ──────────────────────────────────────────────────
router.patch(
  "/instagram/rules/:storeId/:ruleId",
  verifyToken,
  async (req, res) => {
    const { ruleId } = req.params;
    const updates: Record<string, any> = {};
    for (const k of ["keyword", "match_type", "reply", "enabled"]) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (!Object.keys(updates).length)
      return res.status(400).json({ error: "Nothing to update" });
    await db.collection("instagram_rules").doc(ruleId).update(updates);
    res.json({ ok: true });
  },
);

// ── Delete a rule ────────────────────────────────────────────────────────────
router.delete(
  "/instagram/rules/:storeId/:ruleId",
  verifyToken,
  async (req, res) => {
    await db.collection("instagram_rules").doc(req.params.ruleId).delete();
    res.status(204).end();
  },
);

export default router;
