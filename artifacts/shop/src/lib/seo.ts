const BASE = "https://store.advize.in";

function setTag(selector: string, attr: string, value: string) {
  let el = document.head.querySelector(selector);
  if (!el) {
    const tag = selector.startsWith("meta") ? "meta" : "link";
    el = document.createElement(tag);
    const parts = selector.match(/\[([^\]]+)="([^"]+)"\]/);
    if (parts) el.setAttribute(parts[1], parts[2]);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function setSEO({
  title,
  description,
  image,
  url,
  type = "website",
}: {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: "website" | "product";
}) {
  document.title = title;

  setTag('meta[name="description"]', "content", description);
  setTag('meta[name="robots"]', "content", "index, follow");

  setTag('link[rel="canonical"]', "href", url);

  setTag('meta[property="og:title"]', "content", title);
  setTag('meta[property="og:description"]', "content", description);
  setTag('meta[property="og:url"]', "content", url);
  setTag('meta[property="og:type"]', "content", type === "product" ? "product" : "website");
  if (image) setTag('meta[property="og:image"]', "content", image);

  setTag('meta[name="twitter:title"]', "content", title);
  setTag('meta[name="twitter:description"]', "content", description);
  if (image) setTag('meta[name="twitter:image"]', "content", image);
}

export function resetSEO() {
  const title = "Advize Store — Start Selling in 5 Minutes";
  const description =
    "Create your own online store with Advize. Sell products, showcase your brand, and grow your business with an easy-to-use platform built for local sellers and creators.";
  const image = `${BASE}/opengraph.jpg`;

  document.title = title;
  setTag('meta[name="description"]', "content", description);
  setTag('meta[name="robots"]', "content", "index, follow");
  setTag('link[rel="canonical"]', "href", BASE + "/");
  setTag('meta[property="og:title"]', "content", title);
  setTag('meta[property="og:description"]', "content", description);
  setTag('meta[property="og:url"]', "content", BASE + "/");
  setTag('meta[property="og:image"]', "content", image);
  setTag('meta[name="twitter:title"]', "content", title);
  setTag('meta[name="twitter:description"]', "content", description);
  setTag('meta[name="twitter:image"]', "content", image);
}

export function injectProductJsonLd({
  name,
  description,
  image,
  price,
  currency = "INR",
  availability,
  url,
  storeName,
}: {
  name: string;
  description?: string;
  image: string;
  price: number;
  currency?: string;
  availability: "InStock" | "OutOfStock";
  url: string;
  storeName: string;
}) {
  const existing = document.getElementById("product-jsonld");
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.id = "product-jsonld";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    name,
    description: description || name,
    image,
    url,
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: price.toFixed(2),
      availability: `https://schema.org/${availability}`,
      seller: { "@type": "Organization", name: storeName },
    },
  });
  document.head.appendChild(script);
}

export function removeProductJsonLd() {
  document.getElementById("product-jsonld")?.remove();
}

export function injectStoreJsonLd({
  name,
  description,
  url,
  image,
  location,
}: {
  name: string;
  description?: string;
  url: string;
  image?: string;
  location?: string;
}) {
  const existing = document.getElementById("store-jsonld");
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.id = "store-jsonld";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Store",
    name,
    description: description || `Shop at ${name} — buy online, order on WhatsApp.`,
    url,
    ...(image ? { image } : {}),
    ...(location ? { address: { "@type": "PostalAddress", addressLocality: location } } : {}),
  });
  document.head.appendChild(script);
}

export function removeStoreJsonLd() {
  document.getElementById("store-jsonld")?.remove();
}
