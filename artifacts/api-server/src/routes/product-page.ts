import { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../lib/firebase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.STORE_BASE_URL ?? "https://store.advize.in";
const IS_PROD = process.env.NODE_ENV === "production";

// Path to the Vite build output (used in production)
const SHOP_STATIC_DIR = path.resolve(__dirname, "../../../../artifacts/shop/dist/public");

// Vite dev server port (matches artifact.toml PORT for shop service)
const VITE_PORT = process.env.SHOP_DEV_PORT ?? "24349";

// Social crawler User-Agent patterns — these bots don't run JavaScript
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

function buildOgHtml(params: {
  id: string;
  name: string;
  description: string;
  price: number;
  inStock: boolean;
  proxyImage: string;
  productUrl: string;
  title: string;
}): string {
  const { id, name, description, price, inStock, proxyImage, productUrl, title } = params;
  const priceStr = price > 0 ? price.toFixed(2) : "0.00";
  const availability = inStock ? "in stock" : "out of stock";
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
  <meta property="og:url"                 content="${escHtml(productUrl)}" />
  <meta property="og:site_name"           content="Advize Store" />
  <meta property="og:availability"        content="${availability}" />

  <!-- Pinterest Product Rich Pin required tags -->
  <meta property="product:price:amount"   content="${escHtml(priceStr)}" />
  <meta property="product:price:currency" content="INR" />
  <meta property="product:availability"   content="${availability}" />

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
  <meta http-equiv="refresh" content="0;url=${escHtml(productUrl)}" />
</head>
<body style="font-family:sans-serif;padding:2rem;background:#0f0f0f;color:#fff">
  <p>Redirecting to <a href="${escHtml(productUrl)}" style="color:#22c55e">${escHtml(name)}</a>…</p>
  <script>window.location.replace(${JSON.stringify(productUrl)});</script>
</body>
</html>`;
}

export async function handleProductPage(req: Request, res: Response) {
  const { id } = req.params;
  const ua = req.headers["user-agent"] ?? "";
  const isBot = BOT_RE.test(ua);

  if (!isBot) {
    // ── Regular browser ──────────────────────────────────────────────────────
    // Serve the SPA index.html so client-side routing takes over at /product/:id
    if (IS_PROD) {
      return res.sendFile(path.join(SHOP_STATIC_DIR, "index.html"), (err) => {
        if (err) res.status(500).send("Could not serve app");
      });
    } else {
      // In dev, fetch index.html from the Vite dev server
      try {
        const viteRes = await fetch(`http://localhost:${VITE_PORT}/`);
        const html = await viteRes.text();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
      } catch {
        // Fallback: hard redirect to root (Vite dev handles it)
        return res.redirect(302, `http://localhost:${VITE_PORT}/product/${id}`);
      }
    }
  }

  // ── Social bot ─────────────────────────────────────────────────────────────
  try {
    const productDoc = await db.collection("products").doc(id).get();
    if (!productDoc.exists) return res.status(404).send("Product not found");

    const data = productDoc.data()!;
    const storeId: string = data["store_id"] ?? "";
    const name: string = data["name"] ?? "Product";
    const rawDesc: string = (data["description"] ?? "").replace(/<[^>]*>/g, "").trim();
    const price: number = Number(data["sale_price"] || data["price"] || 0);
    const inStock: boolean = (data["units"] ?? 1) > 0;

    let storeName = "Advize Store";
    if (storeId) {
      const storeDoc = await db.collection("stores").doc(storeId).get();
      if (storeDoc.exists) storeName = storeDoc.data()?.["name"] ?? storeName;
    }

    const productUrl = `${BASE_URL}/product/${id}`;
    const proxyImage = `${BASE_URL}/api/og/product/${id}/image`;
    const title = `${name} — ${storeName}`;
    const pricePrefix = price > 0 ? `₹${price.toLocaleString("en-IN")} · ` : "";
    const description =
      `${pricePrefix}${rawDesc.slice(0, 180) || `Buy ${name} online. Order directly on WhatsApp.`}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.send(buildOgHtml({ id, name, description, price, inStock, proxyImage, productUrl, title }));
  } catch (err) {
    console.error("product-page handler error:", err);
    return res.status(500).send("Error generating preview");
  }
}
