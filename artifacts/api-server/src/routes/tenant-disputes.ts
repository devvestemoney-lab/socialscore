import { Router, type IRouter } from "express";
import {
  db, disputesTable, disputeResponsesTable, customersTable, tenantsTable,
  usersTable, loansTable, creditScoresTable,
} from "@workspace/db";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;

const ACTIVE = ["open", "under_investigation", "awaiting_institution", "escalated"] as const;
const CLOSED = ["resolved_upheld", "resolved_rejected", "dismissed"] as const;

async function institutionFor(tenantId: string | null | undefined) {
  if (!tenantId) return null;
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  return tenant?.name ?? null;
}

/** Dispute queue for this institution, with SLA context */
router.get("/disputes", ...tenantUser, async (req: AuthRequest, res) => {
  const institution = await institutionFor(req.user!.tenantId);
  if (!institution) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }

  const scope = String(req.query.scope ?? "active");
  const status = String(req.query.status ?? "");
  const conditions: any[] = [eq(disputesTable.institutionName, institution)];
  if (status && status !== "all") conditions.push(eq(disputesTable.status, status as "open"));
  else if (scope === "active") conditions.push(inArray(disputesTable.status, ACTIVE as any));
  else if (scope === "closed") conditions.push(inArray(disputesTable.status, CLOSED as any));
  else if (scope === "investigations") conditions.push(inArray(disputesTable.status, ["under_investigation", "awaiting_institution", "escalated"] as any));

  const [rows, [summary], ageing] = await Promise.all([
    db.select({
      id: disputesTable.id, caseNo: disputesTable.caseNo,
      consumerName: sql<string>`${customersTable.firstName} || ' ' || ${customersTable.lastName}`,
      nrc: customersTable.nrc,
      type: disputesTable.type, description: disputesTable.description,
      status: disputesTable.status, resolution: disputesTable.resolution,
      openedAt: disputesTable.openedAt, dueAt: disputesTable.dueAt, resolvedAt: disputesTable.resolvedAt,
      responses: sql<number>`(select count(*)::int from dispute_responses r where r.dispute_id = ${disputesTable.id})`,
      lastResponseAt: sql<string | null>`(select max(r.created_at) from dispute_responses r where r.dispute_id = ${disputesTable.id})`,
    })
      .from(disputesTable)
      .innerJoin(customersTable, eq(disputesTable.customerId, customersTable.id))
      .where(and(...conditions))
      .orderBy(disputesTable.dueAt)
      .limit(100),
    db.select({
      open: sql<number>`count(*) filter (where status in ('open','under_investigation','awaiting_institution','escalated'))::int`,
      awaitingUs: sql<number>`count(*) filter (where status = 'awaiting_institution')::int`,
      investigating: sql<number>`count(*) filter (where status in ('under_investigation','escalated'))::int`,
      pastSla: sql<number>`count(*) filter (where status in ('open','under_investigation','awaiting_institution','escalated') and due_at < now())::int`,
      dueThisWeek: sql<number>`count(*) filter (where status in ('open','under_investigation','awaiting_institution','escalated') and due_at between now() and now() + interval '7 days')::int`,
      resolved90d: sql<number>`count(*) filter (where resolved_at >= now() - interval '90 days')::int`,
      upheld90d: sql<number>`count(*) filter (where resolved_at >= now() - interval '90 days' and status = 'resolved_upheld')::int`,
      avgResolutionDays: sql<number>`coalesce(round(avg(extract(epoch from (resolved_at - opened_at)) / 86400) filter (where resolved_at is not null))::int, 0)`,
      avgResponseDays: sql<number>`coalesce(round(avg(extract(epoch from (
          (select min(r.created_at) from dispute_responses r where r.dispute_id = disputes.id) - opened_at)) / 86400))::numeric, 1)::float`,
    }).from(disputesTable).where(eq(disputesTable.institutionName, institution)),
    db.execute(sql`
      select case
        when extract(day from now() - opened_at) <= 5 then '0-5 days'
        when extract(day from now() - opened_at) <= 10 then '6-10 days'
        when extract(day from now() - opened_at) <= 15 then '11-15 days'
        when extract(day from now() - opened_at) <= 21 then '16-21 days'
        else 'Past 21 days' end as bucket, count(*)::int as n
      from disputes where institution_name = ${institution}
        and status in ('open','under_investigation','awaiting_institution','escalated')
      group by 1`).then(r => r.rows),
  ]);

  res.json({ disputes: rows, summary, ageing, institution });
});

/** Case file: consumer context, your facilities and the full correspondence trail */
router.get("/disputes/:id", ...tenantUser, async (req: AuthRequest, res) => {
  const institution = await institutionFor(req.user!.tenantId);
  const [dispute] = await db.select().from(disputesTable)
    .where(and(eq(disputesTable.id, req.params.id), eq(disputesTable.institutionName, institution ?? "")));
  if (!dispute) { res.status(404).json({ error: "Not Found", message: "Dispute not found for your institution" }); return; }

  const [[customer], responses, loans, [score]] = await Promise.all([
    db.select().from(customersTable).where(eq(customersTable.id, dispute.customerId)),
    db.select().from(disputeResponsesTable).where(eq(disputeResponsesTable.disputeId, dispute.id))
      .orderBy(desc(disputeResponsesTable.createdAt)),
    db.select().from(loansTable)
      .where(and(eq(loansTable.customerId, dispute.customerId), eq(loansTable.institution, institution ?? "")))
      .orderBy(desc(loansTable.disbursedAt)),
    db.select().from(creditScoresTable).where(eq(creditScoresTable.customerId, dispute.customerId))
      .orderBy(desc(creditScoresTable.createdAt)).limit(1),
  ]);

  const daysOpen = Math.floor((Date.now() - new Date(dispute.openedAt).getTime()) / 86_400_000);
  res.json({
    dispute, customer, responses, loans,
    latestScore: score ? { score: Math.round(Number(score.score)), rating: score.rating } : null,
    sla: {
      daysOpen,
      daysRemaining: Math.ceil((new Date(dispute.dueAt).getTime() - Date.now()) / 86_400_000),
      breached: !dispute.resolvedAt && new Date(dispute.dueAt) < new Date(),
    },
  });
});

/** Submit the institution's response / evidence on a dispute */
router.post("/disputes/:id/respond", ...tenantUser, async (req: AuthRequest, res) => {
  const institution = await institutionFor(req.user!.tenantId);
  const [dispute] = await db.select().from(disputesTable)
    .where(and(eq(disputesTable.id, req.params.id), eq(disputesTable.institutionName, institution ?? "")));
  if (!dispute) { res.status(404).json({ error: "Not Found", message: "Dispute not found for your institution" }); return; }
  if (dispute.resolvedAt) { res.status(400).json({ error: "Bad Request", message: "This case is already closed" }); return; }

  const { body, position, kind = "response", attachments = [] } = req.body ?? {};
  if (!body || String(body).trim().length < 10) {
    res.status(400).json({ error: "Bad Request", message: "A substantive response of at least 10 characters is required" });
    return;
  }
  if (kind === "response" && !["record_accurate", "record_corrected", "partially_upheld", "investigating"].includes(position)) {
    res.status(400).json({ error: "Bad Request", message: "A position is required on a formal response" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [response] = await db.insert(disputeResponsesTable).values({
    disputeId: dispute.id, tenantId: req.user!.tenantId ?? null,
    kind, position: kind === "response" ? position : null,
    body: String(body).trim(), attachments,
    authorName: user?.name ?? "",
  }).returning();

  // A formal response hands the case back to the bureau for adjudication
  let updated = dispute;
  if (kind === "response") {
    [updated] = await db.update(disputesTable)
      .set({ status: "under_investigation", updatedAt: new Date() })
      .where(eq(disputesTable.id, dispute.id)).returning();
  }
  res.status(201).json({ response, dispute: updated });
});

export default router;
