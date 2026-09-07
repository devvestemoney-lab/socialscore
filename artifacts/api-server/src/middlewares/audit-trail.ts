import type { Request, Response, NextFunction } from "express";
import { db, auditLogsTable } from "@workspace/db";
import type { AuthRequest } from "./auth.js";
import { logger } from "../lib/logger.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Derive an action slug like "admin_institutions_created" from method + path */
function actionFor(method: string, path: string): string {
  const parts = path.split("/").filter(Boolean)
    .filter(p => !/^[0-9a-f-]{20,}$/i.test(p)) // drop ids
    .map(p => p.replace(/-/g, "_"));
  const verb = method === "POST" ? "created" : method === "DELETE" ? "deleted" : "updated";
  return ["admin", ...parts, verb].join("_");
}

/** After a successful mutating /admin request, write an audit log entry */
export function auditTrail(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING.has(req.method)) { next(); return; }
  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    const user = (req as AuthRequest).user;
    db.insert(auditLogsTable).values({
      action: actionFor(req.method, req.path),
      userId: user?.userId ?? "system",
      tenantId: user?.tenantId ?? null,
      ipAddress: req.ip ?? null,
      details: { method: req.method, path: `/admin${req.path}`, status: res.statusCode },
    }).catch(err => logger.warn({ err }, "audit trail write failed"));
  });
  next();
}
