import { Request, Response } from "express";
import { db } from "../lib/firebase.js";

const BASE_URL = process.env.STORE_BASE_URL ?? "https://store.advize.in";
const IS_PROD  = process.env.NODE_ENV === "production";
const VITE_PORT = process.env.SHOP_DEV_PORT ?? "24349";

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

function buildStoreOgHtml(params: {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  storeUrl: string;
  category?: string;
  location?: string;
}): string {
  const { name, description, imageUrl, storeUrl, category, location } = params;

  const schemaAddress = location ? { "@type": "PostalAddress", addressLocality: location } : undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(name)} — Shop on Advize</title>
  <meta name="description" content="${escHtml(description)}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:title"       content="${escHtml(name)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:image"       content="${escHtml(imageUrl)}" />
  <meta property="og:image:secure_url" content="${escHtml(imageUrl)}" />
  <meta property="og:url"         content="${escHtml(storeUrl)}" />
  <meta property="og:site_name"   content="${escHtml(name)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escHtml(name)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image"       content="${escHtml(imageUrl)}" />

  <!-- Schema.org LocalBusiness -->
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Store",
    name,
    description,
    image: imageUrl,
    url: storeUrl,
    ...(category ? { "@type": "LocalBusiness", description: `${category} store` } : {}),
    ...(schemaAddress ? { address: schemaAddress } : {}),
  })}</script>

  <link rel="canonical" href="${escHtml(storeUrl)}" />
</head>
<body></body>
</html>`;
}

export async function handleStorePage(req: Request, res: Response) {
  const { slug } = req.params;
  const ua    = req.headers["user-agent"] ?? "";
  const isBot = BOT_RE.test(ua);

  if (!isBot) {
    const spaRoot = IS_PROD
      ? `${BASE_URL}/`
      : `http://localhost:${VITE_PORT}/`;
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
    } catch {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(`<!DOCTYPE html><html><head>
        <meta http-equiv="refresh" content="0;url=${escHtml(`${BASE_URL}/store/${slug}`)}" />
      </head><body><script>location.href=${JSON.stringify(`${BASE_URL}/store/${slug}`)}</script></body></html>`);
    }
  }

  // Social bot — return OG HTML with store branding
  try {
    const storeSnap = await db.collection("stores")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    let storeData: FirebaseFirestore.DocumentData | null = null;
    if (!storeSnap.empty) {
      storeData = storeSnap.docs[0].data();
    } else {
      // Fallback: try treating slug as a Firestore document ID
      const byId = await db.collection("stores").doc(slug).get();
      if (byId.exists) storeData = byId.data()!;
    }

    if (!storeData) return res.status(404).send("Store not found");

    const name: string      = storeData["name"] ?? "Store";
    const rawDesc: string   = (storeData["description"] ?? "").replace(/<[^>]*>/g, "").trim();
    const category: string  = storeData["category"] ?? "";
    const location: string  = storeData["location"] ?? "";
    const logoUrl: string   = storeData["logo_url"] ?? "";

    const storeUrl   = `${BASE_URL}/store/${slug}`;
    // Use the proxied logo if available, else fall back to the platform OG image
    const imageUrl   = logoUrl
      ? `${BASE_URL}/api/og/store/${encodeURIComponent(slug)}/image`
      : `${BASE_URL}/opengraph.jpg`;

    const categoryLine = category ? `${category} store` : "Online store";
    const locationLine = location ? ` · ${location}` : "";
    const description  = rawDesc.slice(0, 200) ||
      `${categoryLine}${locationLine}. Browse products and order directly on WhatsApp.`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.send(buildStoreOgHtml({ slug, name, description, imageUrl, storeUrl, category, location }));
  } catch (err) {
    console.error("store-page handler error:", err);
    return res.status(500).send("Error generating preview");
  }
}
