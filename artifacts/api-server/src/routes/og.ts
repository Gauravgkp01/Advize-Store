import { Router } from "express";
import { db } from "../lib/firebase.js";

const router = Router();
const BASE_URL = process.env.STORE_BASE_URL ?? "https://store.advize.in";

function escHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ── Image proxy ─────────────────────────────────────────────────────────
   Fetches the product image server-side and re-serves it with clean headers.
   This bypasses Firebase Storage CORS/token issues for social crawlers.
   GET /api/og/product/:id/image
───────────────────────────────────────────────────────────────────────── */
router.get("/og/product/:id/image", async (req, res) => {
  const { id } = req.params;
  try {
    const productDoc = await db.collection("products").doc(id).get();
    if (!productDoc.exists) return res.status(404).send("Not found");

    const imageUrl: string = productDoc.data()?.["image_url"] ?? "";
    if (!imageUrl) return res.status(404).send("No image");

    const upstream = await fetch(imageUrl, {
      headers: { "User-Agent": "Advize-OG-Bot/1.0" },
    });

    if (!upstream.ok) return res.status(502).send("Could not fetch image");

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600, immutable");
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error("OG image proxy error:", err);
    return res.status(500).send("Error");
  }
});

/* ── OG meta page ────────────────────────────────────────────────────────
   Returns a tiny HTML page with Open Graph / Twitter Card meta tags.
   Social crawlers read this; browsers are immediately redirected to the SPA.
   GET /api/og/product/:id
───────────────────────────────────────────────────────────────────────── */
router.get("/og/product/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const productDoc = await db.collection("products").doc(id).get();
    if (!productDoc.exists) return res.status(404).send("Product not found");

    const data = productDoc.data()!;
    const storeId: string  = data["store_id"] ?? "";
    const name: string     = data["name"] ?? "Product";
    const rawDesc: string  = (data["description"] ?? "").replace(/<[^>]*>/g, "").trim();
    const price: number    = data["sale_price"] || data["price"] || 0;

    let storeName = "Advize Store";
    if (storeId) {
      const storeDoc = await db.collection("stores").doc(storeId).get();
      if (storeDoc.exists) storeName = storeDoc.data()?.["name"] ?? storeName;
    }

    const productUrl = `${BASE_URL}/product/${id}`;
    const proxyImage = `${BASE_URL}/api/og/product/${id}/image`;
    const title      = `${name} — ${storeName}`;
    const priceStr   = price > 0 ? `₹${price.toLocaleString("en-IN")} · ` : "";
    const description = `${priceStr}${rawDesc.slice(0, 180) || `Buy ${name} online. Order directly on WhatsApp.`}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />

  <meta property="og:type"         content="product" />
  <meta property="og:title"        content="${escHtml(title)}" />
  <meta property="og:description"  content="${escHtml(description)}" />
  <meta property="og:image"        content="${escHtml(proxyImage)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type"   content="image/jpeg" />
  <meta property="og:url"          content="${escHtml(productUrl)}" />
  <meta property="og:site_name"    content="Advize Store" />

  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image"       content="${escHtml(proxyImage)}" />

  <meta http-equiv="refresh" content="0;url=${escHtml(productUrl)}" />
</head>
<body style="font-family:sans-serif;padding:2rem;background:#0f0f0f;color:#fff">
  <p>Redirecting to <a href="${escHtml(productUrl)}" style="color:#22c55e">${escHtml(name)}</a>…</p>
  <script>window.location.replace("${productUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}");</script>
</body>
</html>`);
  } catch (err) {
    console.error("OG product error:", err);
    res.status(500).send("Error generating preview");
  }
});

export default router;
