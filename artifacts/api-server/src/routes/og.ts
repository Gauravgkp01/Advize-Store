import { Router } from "express";
import { db } from "../lib/firebase.js";

const router = Router();
const BASE_URL = process.env.STORE_BASE_URL ?? "https://store.advize.in";

// Social crawler User-Agent patterns
const BOT_RE =
  /pinterestbot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsappbot|telegrambot|googlebot|bingbot|applebot|discordbot|embedly|yahoo|ia_archiver|semrushbot|ahrefsbot/i;

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
   - Social bots  → full OG HTML with Pinterest Product Rich Pin tags (no redirect)
   - Real browsers → 302 redirect straight to the SPA product page
   GET /api/og/product/:id
───────────────────────────────────────────────────────────────────────── */
router.get("/og/product/:id", async (req, res) => {
  const { id } = req.params;
  const ua = req.headers["user-agent"] ?? "";
  const isBot = BOT_RE.test(ua);
  const productUrl = `${BASE_URL}/product/${id}`;

  // Browsers get a plain 302 — no meta-refresh, no confusion for crawlers
  if (!isBot) {
    return res.redirect(302, productUrl);
  }

  try {
    const productDoc = await db.collection("products").doc(id).get();
    if (!productDoc.exists) return res.status(404).send("Product not found");

    const data = productDoc.data()!;
    const storeId: string  = data["store_id"] ?? "";
    const name: string     = data["name"] ?? "Product";
    const rawDesc: string  = (data["description"] ?? "").replace(/<[^>]*>/g, "").trim();
    const price: number    = Number(data["sale_price"] || data["price"] || 0);
    const inStock: boolean = (data["units"] ?? 1) > 0;

    let storeName = "Advize Store";
    if (storeId) {
      const storeDoc = await db.collection("stores").doc(storeId).get();
      if (storeDoc.exists) storeName = storeDoc.data()?.["name"] ?? storeName;
    }

    const proxyImage  = `${BASE_URL}/api/og/product/${id}/image`;
    const title       = `${name} — ${storeName}`;
    const priceStr    = price > 0 ? price.toFixed(2) : "0.00";
    const pricePrefix = price > 0 ? `₹${price.toLocaleString("en-IN")} · ` : "";
    const description = `${pricePrefix}${rawDesc.slice(0, 180) || `Buy ${name} online. Order directly on WhatsApp.`}`;
    const availability = inStock ? "in stock" : "out of stock";
    const schemaAvailability = inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />

  <!-- Open Graph / Pinterest Product Rich Pins -->
  <meta property="og:type"                content="product" />
  <meta property="og:title"               content="${escHtml(title)}" />
  <meta property="og:description"         content="${escHtml(description)}" />
  <meta property="og:image"               content="${escHtml(proxyImage)}" />
  <meta property="og:image:width"         content="1200" />
  <meta property="og:image:height"        content="630" />
  <meta property="og:image:type"          content="image/jpeg" />
  <meta property="og:url"                 content="${escHtml(productUrl)}" />
  <meta property="og:site_name"           content="Advize Store" />
  <meta property="og:availability"        content="${escHtml(availability)}" />

  <!-- Pinterest Product Rich Pin required tags -->
  <meta property="product:price:amount"   content="${escHtml(priceStr)}" />
  <meta property="product:price:currency" content="INR" />
  <meta property="product:availability"   content="${escHtml(availability)}" />

  <!-- Legacy og:price tags (broader compatibility) -->
  <meta property="og:price:amount"        content="${escHtml(priceStr)}" />
  <meta property="og:price:currency"      content="INR" />

  <!-- Twitter Card -->
  <meta name="twitter:card"              content="summary_large_image" />
  <meta name="twitter:title"             content="${escHtml(title)}" />
  <meta name="twitter:description"       content="${escHtml(description)}" />
  <meta name="twitter:image"             content="${escHtml(proxyImage)}" />

  <!-- Schema.org structured data -->
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    name,
    description,
    image: proxyImage,
    url: productUrl,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: priceStr,
      availability: schemaAvailability,
    },
  })}</script>

  <link rel="canonical" href="${escHtml(productUrl)}" />
</head>
<body>
</body>
</html>`);
  } catch (err) {
    console.error("OG product error:", err);
    res.status(500).send("Error generating preview");
  }
});

export default router;
