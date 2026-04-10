import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storesRouter from "./stores";
import productsRouter from "./products";
import reviewsRouter from "./reviews";
import analyticsRouter from "./analytics";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storesRouter);
router.use(productsRouter);
router.use(reviewsRouter);
router.use(analyticsRouter);
router.use(uploadRouter);

export default router;
