import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storesRouter from "./stores";
import productsRouter from "./products";
import reviewsRouter from "./reviews";
import analyticsRouter from "./analytics";
import uploadRouter from "./upload";
import paymentsRouter from "./payments";
import sitemapRouter from "./sitemap";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storesRouter);
router.use(productsRouter);
router.use(reviewsRouter);
router.use(analyticsRouter);
router.use(uploadRouter);
router.use(paymentsRouter);
router.use(sitemapRouter);

export default router;
