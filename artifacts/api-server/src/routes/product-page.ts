import { Request, Response } from "express";
import { db } from "../lib/firebase.js";

const BASE_URL = process.env.STORE_BASE_URL ?? "https://store.advize.in";
const IS_PROD = process.env.NODE_ENV === "production";

// Vite dev server port (matches artifact.toml PORT for shop service)
const VITE_PORT = process.env.SHOP_DEV_PORT ?? "24349";

// Social crawler / link-preview User-Agent patterns.
// Note: WhatsApp sends "WhatsApp/2.x.x" (not "whatsappbot"), Telegram sends
// "TelegramBot" — both are matched by the patterns below.
const BOT_RE =
  /pinterestbot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsapp|telegram|googlebot|bingbot|applebot|discordbot|embedly|yahoo|ia_archiver|semrushbot|ahrefsbot|signal|viber/i;

function escHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOgHtml(params: {
  id: string;
  name: string;
  storeName: string;
  description: string;
  price: number;
  inStock: boolean;
  proxyImage: string;
  productUrl: string;
  title: string;
}): string {
  const { name, storeName, description, price, inStock, proxyImage, productUrl, title } = params;
  const priceStr         = price > 0 ? String(price) : "0";
  // Pinterest requires "instock" (no space) and "out of stock" (with space)
  const ogAvailability   = inStock ? "instock" : "out of stock";
  const schemaAvailability = inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  return `<!DOCTYPE html>
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
  <meta property="og:image:secure_url"    content="${escHtml(proxyImage)}" />
  <meta property="og:url"                 content="${escHtml(productUrl)}" />
  <meta property="og:site_name"           content="${escHtml(storeName)}" />
  <meta property="og:availability"        content="${ogAvailability}" />

  <!-- Pinterest Product Rich Pin required tags -->
  <meta property="product:price:amount"   content="${escHtml(priceStr)}" />
  <meta property="product:price:currency" content="INR" />
  <meta property="product:availability"   content="${ogAvailability}" />

  <!-- Legacy og:price tags (broader compatibility) -->
  <meta property="og:price:amount"        content="${escHtml(priceStr)}" />
  <meta property="og:price:currency"      content="INR" />

  <!-- Twitter Card -->
  <meta name="twitter:card"              content="summary_large_image" />
  <meta name="twitter:title"             content="${escHtml(title)}" />
  <meta name="twitter:description"       content="${escHtml(description)}" />
  <meta name="twitter:image"             content="${escHtml(proxyImage)}" />

  <!-- Schema.org Product structured data -->
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    name,
    description,
    image: [proxyImage],
    brand: { "@type": "Brand", name: storeName },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: priceStr,
      availability: schemaAvailability,
    },
  })}</script>

  <link rel="canonical" href="${escHtml(productUrl)}" />
</head>
<body>
</body>
</html>`;
}

export async function handleProductPage(req: Request, res: Response) {
  const { id } = req.params;
  const ua = req.headers["user-agent"] ?? "";
  const isBot = BOT_RE.test(ua);

  if (!isBot) {
    // ── Regular browser ──────────────────────────────────────────────────────
    // Fetch the SPA index.html and serve it — the React app boots at the
    // current URL (/product/:id) and its router renders the product page.
    const spaRoot = IS_PROD
      ? `${BASE_URL}/`                      // shop CDN in production
      : `http://localhost:${VITE_PORT}/`;   // Vite dev server locally
    try {
      const spaRes = await fetch(spaRoot, {
        headers: { "Accept": "text/html" },
        signal: AbortSignal.timeout(5000),
      });
      if (!spaRes.ok) throw new Error(`SPA fetch failed: ${spaRes.status}`);
      const html = await spaRes.text();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.send(html);
    } catch (err) {
      console.error("product-page: could not fetch SPA shell:", err);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(`<!DOCTYPE html><html><head>
        <meta http-equiv="refresh" content="0;url=${escHtml(`${BASE_URL}/product/${id}`)}" />
      </head><body><script>location.href=${JSON.stringify(`${BASE_URL}/product/${id}`)}</script></body></html>`);
    }
  }

  // ── Social bot ─────────────────────────────────────────────────────────────
  try {
    const productDoc = await db.collection("products").doc(id).get();
    if (!productDoc.exists) return res.status(404).send("Product not found");

    const data = productDoc.data()!;
    const storeId: string = data["store_id"] ?? "";
    const name: string    = data["name"] ?? "Product";
    const rawDesc: string = (data["description"] ?? "").replace(/<[^>]*>/g, "").trim();
    const price: number   = Number(data["sale_price"] || data["price"] || 0);
    const inStock: boolean = (data["units"] ?? 1) > 0;

    let storeName = "Advize Store";
    if (storeId) {
      const storeDoc = await db.collection("stores").doc(storeId).get();
      if (storeDoc.exists) storeName = storeDoc.data()?.["name"] ?? storeName;
    }

    const productUrl  = `${BASE_URL}/product/${id}`;
    const proxyImage  = `${BASE_URL}/api/og/product/${id}/image`;
    const title       = `${name} — ${storeName}`;
    const pricePrefix = price > 0 ? `₹${price.toLocaleString("en-IN")} · ` : "";
    const description = `${pricePrefix}${rawDesc.slice(0, 180) || `Buy ${name} online. Order directly on WhatsApp.`}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.send(buildOgHtml({ id, name, storeName, description, price, inStock, proxyImage, productUrl, title }));
  } catch (err) {
    console.error("product-page handler error:", err);
    return res.status(500).send("Error generating preview");
  }
}
