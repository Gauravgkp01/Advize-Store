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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bot-aware page handlers — must be registered before static/SPA fallbacks.
// Social crawlers get OG HTML; real browsers get the SPA index.html.
app.get("/product/:id", handleProductPage);
app.get("/store/:slug", handleStorePage);

app.use("/api", router);

export default app;
