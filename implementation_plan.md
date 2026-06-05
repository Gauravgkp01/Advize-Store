# Migrate Advize Store: Vercel (Frontend) + Render (API Server)

Split deployment: **Vercel** hosts the Shop SPA, **Render** hosts the Express API.

## Current Architecture (on Replit)

| Component | Replit setup |
|---|---|
| **Shop** (`artifacts/shop`) | Vite dev server or static bundle, served via Replit proxy |
| **API** (`artifacts/api-server`) | Express on port `8080`, esbuild-bundled |
| **API calls** | Frontend uses relative path `${BASE_URL}api/...` (line 54 of `api.ts`) — Replit's proxy routes `/api/*` to the API server |
| **Bot SSR** | Express directly handles `/store/:slug` and `/product/:id` — serves OG HTML for bots, SPA shell for browsers |

## New Architecture

```
store.advize.in (Vercel)          api-advize.onrender.com (Render)
┌──────────────────────┐          ┌──────────────────────┐
│  React SPA (Vite)    │          │  Express API Server  │
│                      │  proxy   │                      │
│  /api/*  ──────────────────────►│  /api/*              │
│  /store/:slug (bot)  ──────────►│  /store/:slug (OG)   │
│  /product/:id (bot)  ──────────►│  /product/:id (OG)   │
│                      │          │                      │
│  /* → index.html     │          │  Firebase, SMTP,     │
│  (SPA fallback)      │          │  Razorpay, etc.      │
└──────────────────────┘          └──────────────────────┘
```

**Why this works well:**
- Vercel's global CDN = instant page loads for the SPA
- Vercel **rewrites** proxy `/api/*` to Render — the browser still sees same-origin requests, so no CORS issues
- Bot-aware routes (`/store/:slug`, `/product/:id`) are also proxied to Render so social crawlers get OG HTML
- Free tiers on both Vercel and Render

---

## Proposed Changes

### 1. Remove Replit-specific code from Vite config

#### [MODIFY] [vite.config.ts](file:///d:/Advize-Store/Advize-Store/artifacts/shop/vite.config.ts)

- Remove `@replit/vite-plugin-runtime-error-modal` import and usage
- Guard `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner` behind `REPL_ID` (already partially done)
- Make `PORT` default to `5173` and `BASE_PATH` default to `/` instead of throwing errors when missing

```diff
-import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
-
-const rawPort = process.env.PORT;
-if (!rawPort) {
-  throw new Error("PORT environment variable is required...");
-}
+const rawPort = process.env.PORT ?? "5173";

-const basePath = process.env.BASE_PATH;
-if (!basePath) {
-  throw new Error("BASE_PATH environment variable is required...");
-}
+const basePath = process.env.BASE_PATH ?? "/";
```

Remove `runtimeErrorOverlay()` from the plugins array.

---

### 2. Create `vercel.json` for Vercel deployment

#### [NEW] [vercel.json](file:///d:/Advize-Store/Advize-Store/vercel.json)

This tells Vercel:
- Where the frontend source is (monorepo subfolder)
- How to build it
- How to proxy `/api/*`, `/store/:slug` (bots), and `/product/:id` (bots) to Render

```json
{
  "buildCommand": "cd ../.. && npm i -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @workspace/shop run build",
  "outputDirectory": "dist/public",
  "framework": null,
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://advize-api.onrender.com/api/:path*" },
    { "source": "/store/:slug", "destination": "https://advize-api.onrender.com/store/:slug" },
    { "source": "/product/:id", "destination": "https://advize-api.onrender.com/product/:id" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

> [!WARNING]
> The Render URL (`https://advize-api.onrender.com`) is a placeholder. You'll get the real URL after creating the Render service. You'll need to update this in `vercel.json`.

> [!IMPORTANT]
> **Bot SSR caveat:** Vercel rewrites forward ALL requests to `/store/:slug` and `/product/:id` to Render (for both bots and browsers). The Express handler already handles both cases — bots get OG HTML, browsers get the SPA shell fetched from `STORE_BASE_URL`. Once Vercel is live, `STORE_BASE_URL` on Render should point to the Vercel URL so the SPA shell fetch works correctly.

---

### 3. Create Render build script for the API server

#### [NEW] [render-build.sh](file:///d:/Advize-Store/Advize-Store/render-build.sh)

```bash
#!/usr/bin/env bash
set -euo pipefail

# Install pnpm
npm install -g pnpm

# Install all workspace deps (API server needs shared libs from lib/*)
pnpm install --frozen-lockfile

# Build only the API server
pnpm --filter @workspace/api-server run build
```

---

### 4. Create Render configuration

#### [NEW] [render.yaml](file:///d:/Advize-Store/Advize-Store/render.yaml)

```yaml
services:
  - type: web
    name: advize-api
    runtime: node
    plan: free
    buildCommand: bash render-build.sh
    startCommand: node artifacts/api-server/dist/index.mjs
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "10000"
      - key: STORE_BASE_URL
        value: https://store.advize.in
      - key: FIREBASE_PROJECT_ID
        sync: false
      - key: FIREBASE_CLIENT_EMAIL
        sync: false
      - key: FIREBASE_PRIVATE_KEY
        sync: false
      - key: FIREBASE_STORAGE_BUCKET
        sync: false
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
      - key: SMTP_FROM
        sync: false
```

---

### 5. Add Node.js version for Render

#### [NEW] [.node-version](file:///d:/Advize-Store/Advize-Store/.node-version)

```
24
```

---

### 6. Set Vercel root directory

When importing the project on Vercel, you must set the **Root Directory** to `artifacts/shop` so Vercel finds the `index.html`, `vite.config.ts`, and the build output.

Alternatively, move `vercel.json` into `artifacts/shop/` and configure the build command relative to that folder.

---

## Environment Variables Summary

### Vercel (Frontend)
Set these in **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `PORT` | `5173` (or omit — defaults work) |
| `BASE_PATH` | `/` (or omit — defaults work) |
| `VITE_FIREBASE_API_KEY` | Your Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `studio-1871371743-58ae3.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `studio-1871371743-58ae3` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `studio-1871371743-58ae3.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

### Render (API Server)
Set these in **Render Dashboard → Environment**:

| Variable | Value |
|---|---|
| `PORT` | `10000` (Render default) |
| `NODE_ENV` | `production` |
| `STORE_BASE_URL` | `https://store.advize.in` |
| `FIREBASE_PROJECT_ID` | `studio-1871371743-58ae3` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@...` |
| `FIREBASE_PRIVATE_KEY` | Paste the full PEM key |
| `FIREBASE_STORAGE_BUCKET` | `studio-1871371743-58ae3.firebasestorage.app` |
| `SMTP_USER` | Your SMTP username |
| `SMTP_PASS` | Your SMTP password |
| `SMTP_FROM` | Your sender email |
| `CASHFREE_ENV` | `production` |

---

## Open Questions

> [!IMPORTANT]
> **Custom domain strategy:**
> Which setup do you want?
> - **Option A:** `store.advize.in` → Vercel (frontend), `api.advize.in` → Render (API)
> - **Option B:** `store.advize.in` → Vercel with rewrites proxying `/api/*` to Render's `.onrender.com` URL (simpler, no extra subdomain)
>
> I recommend **Option B** — it's simpler and keeps your existing URL structure intact.

> [!IMPORTANT]
> **Render plan:**
> Free tier spins down after 15 min of inactivity (cold starts ~30s). Starter ($7/mo) keeps it always-on. The Vercel free tier is fine for the SPA since it's a static CDN.

> [!IMPORTANT]
> **Vercel project setup:**
> When importing the repo on Vercel, you'll need to set the **Root Directory** to `artifacts/shop`. This is configured in the Vercel dashboard during project creation.

## Deployment Steps (Manual)

1. **Push all code changes** to GitHub
2. **Render:**
   - Go to [render.com](https://render.com) → New → Web Service
   - Connect your GitHub repo
   - Root directory: `.` (project root)
   - Build command: `bash render-build.sh`
   - Start command: `node artifacts/api-server/dist/index.mjs`
   - Set all env vars from the table above
   - Deploy → note the `.onrender.com` URL
3. **Vercel:**
   - Go to [vercel.com](https://vercel.com) → Import Project
   - Connect your GitHub repo
   - Root directory: `artifacts/shop`
   - Framework: Other
   - Build command: `cd ../.. && npm i -g pnpm && pnpm install --frozen-lockfile && PORT=5173 BASE_PATH="/" pnpm --filter @workspace/shop run build`
   - Output directory: `dist/public`
   - Set env vars from the table above
   - Update `vercel.json` rewrites with the real Render URL
   - Deploy
4. **DNS:** Point `store.advize.in` to Vercel (CNAME to `cname.vercel-dns.com`)
5. **Test:** Verify all routes, API calls, and bot previews work

## Verification Plan

### Manual Verification
1. `GET /` → SPA landing page loads on Vercel
2. `GET /api/health` → Proxied to Render, returns OK
3. `GET /store/{slug}` → SPA loads for browsers, OG HTML for bots (test with `curl -A "facebookexternalhit"`)
4. `GET /product/{id}` → Same bot/browser split works
5. Login, signup, dashboard, cart flows all functional
6. Image uploads succeed (go through `/api/upload` → Render → Firebase Storage)
