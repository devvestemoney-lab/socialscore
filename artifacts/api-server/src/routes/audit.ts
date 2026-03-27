import { Router, type IRouter } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(limit).offset(offset);
  const total = await db.select().from(auditLogsTable);

  res.json({
    logs: logs.map(l => ({
      id: l.id,
      action: l.action,
      userId: l.userId,
      tenantId: l.tenantId,
      targetNrc: l.targetNrc,
      ipAddress: l.ipAddress,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    })),
    total: total.length,
    page,
    limit,
  });
});

export default router;
