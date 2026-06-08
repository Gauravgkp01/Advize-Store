import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { handleProductPage } from "./routes/product-page.js";
import { handleStorePage } from "./routes/store-page.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const ALLOWED_ORIGINS = [
  "https://store.advize.in",
  "https://advize-store.vercel.app",
  /https:\/\/advize-store[a-z0-9-]*\.vercel\.app$/,
  // allow all localhost ports for local dev
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, mobile apps, same-origin)
      if (!origin) return callback(null, true);
      const allowed = ALLOWED_ORIGINS.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin),
      );
      callback(allowed ? null : new Error("CORS: origin not allowed"), allowed);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bot-aware page handlers — must be registered before static/SPA fallbacks.
// Social crawlers get OG HTML; real browsers get the SPA index.html.
app.get("/product/:id", handleProductPage);
app.get("/store/:slug", handleStorePage);

app.use("/api", router);

export default app;
