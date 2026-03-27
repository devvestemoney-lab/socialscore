import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import identityRouter from "./identity.js";
import creditRouter from "./credit.js";
import loansRouter from "./loans.js";
import riskRouter from "./risk.js";
import consentRouter from "./consent.js";
import tenantsRouter from "./tenants.js";
import analyticsRouter from "./analytics.js";
import integrationsRouter from "./integrations.js";
import auditRouter from "./audit.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/identity", identityRouter);
router.use("/credit-score", creditRouter);
router.use("/loan-exposure", loansRouter);
router.use("/risk-profile", riskRouter);
router.use("/consent", consentRouter);
router.use("/tenants", tenantsRouter);
router.use("/analytics", analyticsRouter);
router.use("/integrations", integrationsRouter);
router.use("/audit-logs", auditRouter);

export default router;
