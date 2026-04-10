import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storesRouter from "./stores";
import productsRouter from "./products";
import reviewsRouter from "./reviews";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storesRouter);
router.use(productsRouter);
router.use(reviewsRouter);
router.use(analyticsRouter);

export default router;
