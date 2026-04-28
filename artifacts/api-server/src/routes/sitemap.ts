import { Router } from "express";
import { db } from "../lib/firebase.js";

const router = Router();

const BASE_URL = "https://store.advize.in";

router.get("/sitemap-stores.xml", async (_req, res) => {
  try {
    const snap = await db.collection("stores").get();

    const urls: string[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data.slug) continue;

      const storeUrl = `${BASE_URL}/store/${encodeURIComponent(data.slug)}`;
      const updatedAt: string = data.updated_at?.toDate
        ? data.updated_at.toDate().toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      urls.push(`
  <url>
    <loc>${storeUrl}</loc>
    <lastmod>${updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err: any) {
    res.status(500).send("<?xml version=\"1.0\"?><error>Failed to generate sitemap</error>");
  }
});

export default router;
