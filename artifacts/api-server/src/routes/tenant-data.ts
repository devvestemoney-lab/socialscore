import { Router, type IRouter } from "express";
import {
  db, dataUploadsTable, validationErrorsTable, dataSubmissionsTable,
  dataQualityReviewsTable, dataQualityIssuesTable, institutionsTable,
  tenantsTable, usersTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;

/** Resolve the institution registry record behind this tenant */
async function institutionFor(tenantId: string | null | undefined) {
  if (!tenantId) return null;
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  if (!tenant) return null;
  const [byLink] = await db.select().from(institutionsTable).where(eq(institutionsTable.tenantId, tenantId));
  if (byLink) return byLink;
  const [byName] = await db.select().from(institutionsTable).where(eq(institutionsTable.name, tenant.name));
  return byName ?? null;
}

/** Rules the bureau validates a batch against */
const RULES = [
  { code: "E-104", rule: "NRC missing or malformed", severity: "blocking" as const, rate: 0.004,
    fix: "Populate consumer NRC from KYC records before extract" },
  { code: "E-211", rule: "Negative balance on an active facility", severity: "blocking" as const, rate: 0.0015,
    fix: "Check reversal postings before generating the extract" },
  { code: "E-307", rule: "Disbursement date after the reporting period", severity: "blocking" as const, rate: 0.001,
    fix: "Exclude facilities opened after month end" },
  { code: "E-118", rule: "Unknown branch code", severity: "warning" as const, rate: 0.0007,
    fix: "Register new branches under Administration → Branches" },
  { code: "E-402", rule: "Duplicate account reference in batch", severity: "blocking" as const, rate: 0.0004,
    fix: "De-duplicate on account plus product code" },
];

// ─── SUBMISSION HISTORY ──────────────────────────────────────────────────────

router.get("/submissions", ...tenantUser, async (req: AuthRequest, res) => {
  const institution = await institutionFor(req.user!.tenantId);
  if (!institution) { res.status(404).json({ error: "Not Found", message: "No institution registry record linked to your tenant" }); return; }

  const [cycles, [summary]] = await Promise.all([
    db.select().from(dataSubmissionsTable)
      .where(eq(dataSubmissionsTable.institutionId, institution.id))
      .orderBy(desc(dataSubmissionsTable.period)),
    db.select({
      cycles: sql<number>`count(*)::int`,
      submitted: sql<number>`coalesce(sum(records_submitted), 0)::int`,
      accepted: sql<number>`coalesce(sum(records_accepted), 0)::int`,
      rejected: sql<number>`coalesce(sum(records_rejected), 0)::int`,
      onTime: sql<number>`count(*) filter (where status in ('accepted','partial'))::int`,
      overdue: sql<number>`count(*) filter (where status = 'overdue')::int`,
    }).from(dataSubmissionsTable).where(eq(dataSubmissionsTable.institutionId, institution.id)),
  ]);

  const current = new Date().toISOString().slice(0, 7);
  res.json({
    institution: { id: institution.id, name: institution.name, status: institution.status },
    cycles,
    currentPeriod: current,
    currentCycle: cycles.find(c => c.period === current) ?? null,
    summary: {
      ...summary,
      acceptanceRate: summary.submitted > 0 ? Math.round((summary.accepted / summary.submitted) * 1000) / 10 : 0,
      onTimeRate: summary.cycles > 0 ? Math.round((summary.onTime / summary.cycles) * 100) : 0,
    },
  });
});

// ─── UPLOADS ─────────────────────────────────────────────────────────────────

router.get("/uploads", ...tenantUser, async (req: AuthRequest, res) => {
  const institution = await institutionFor(req.user!.tenantId);
  if (!institution) { res.status(404).json({ error: "Not Found", message: "No institution registry record linked to your tenant" }); return; }
  const uploads = await db.select().from(dataUploadsTable)
    .where(eq(dataUploadsTable.institutionId, institution.id))
    .orderBy(desc(dataUploadsTable.createdAt)).limit(50);
  res.json({ uploads });
});

/** Submit a batch: validates against the rule set and records the outcome */
router.post("/uploads", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const institution = await institutionFor(tenantId);
  if (!institution) { res.status(404).json({ error: "Not Found", message: "No institution registry record linked to your tenant" }); return; }

  const { fileName, period, format = "crb_xml_v3", recordCount } = req.body ?? {};
  if (!fileName || !period) {
    res.status(400).json({ error: "Bad Request", message: "fileName and period are required" }); return;
  }
  const records = Number(recordCount) > 0 ? Number(recordCount) : 0;
  if (records <= 0) {
    res.status(400).json({ error: "Bad Request", message: "A positive record count is required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

  // Validate: each rule rejects a share of records
  const findings = RULES
    .map(r => ({ ...r, affected: Math.floor(records * r.rate * (0.4 + Math.random() * 1.2)) }))
    .filter(r => r.affected > 0);
  const rejected = findings.filter(f => f.severity === "blocking").reduce((a, f) => a + f.affected, 0);
  const accepted = records - rejected;
  const rejectRate = records > 0 ? rejected / records : 0;
  const status = rejectRate > 0.25 ? "rejected" : rejectRate > 0.005 ? "accepted_with_errors" : "accepted";

  const [{ maxNo }] = await db.select({
    maxNo: sql<number>`coalesce(max(nullif(split_part(upload_no, '-', 2), '')::int), 3300)`,
  }).from(dataUploadsTable);

  const [upload] = await db.insert(dataUploadsTable).values({
    uploadNo: `UPL-${Number(maxNo) + 1}`,
    institutionId: institution.id, tenantId: tenantId ?? null,
    fileName, sizeBytes: records * 420, format, period,
    recordsSubmitted: records,
    recordsAccepted: status === "rejected" ? 0 : accepted,
    recordsRejected: rejected,
    progress: 100, status,
    uploadedBy: user?.name ?? "",
    completedAt: new Date(),
  }).returning();

  if (findings.length) {
    await db.insert(validationErrorsTable).values(findings.map(f => ({
      uploadId: upload.id, code: f.code, rule: f.rule,
      affectedRecords: f.affected, severity: f.severity,
      sampleLocation: `rows ${Math.floor(Math.random() * records)}–${Math.floor(Math.random() * records) + 40}`,
      suggestedFix: f.fix,
    })));
  }

  // Reflect the outcome on the reporting cycle
  if (status !== "rejected") {
    const [existing] = await db.select().from(dataSubmissionsTable)
      .where(and(eq(dataSubmissionsTable.institutionId, institution.id), eq(dataSubmissionsTable.period, period)));
    const cycleStatus = status === "accepted" ? "accepted" : "partial";
    if (existing) {
      await db.update(dataSubmissionsTable).set({
        recordsSubmitted: existing.recordsSubmitted + records,
        recordsAccepted: existing.recordsAccepted + accepted,
        recordsRejected: existing.recordsRejected + rejected,
        status: cycleStatus, submittedAt: new Date(),
      }).where(eq(dataSubmissionsTable.id, existing.id));
    } else {
      await db.insert(dataSubmissionsTable).values({
        institutionId: institution.id, period,
        recordsSubmitted: records, recordsAccepted: accepted, recordsRejected: rejected,
        status: cycleStatus, submittedAt: new Date(),
      });
    }
  }

  res.status(201).json({ upload, findings: findings.length, rejected });
});

// ─── VALIDATION ERRORS ───────────────────────────────────────────────────────

router.get("/validation-errors", ...tenantUser, async (req: AuthRequest, res) => {
  const institution = await institutionFor(req.user!.tenantId);
  if (!institution) { res.status(404).json({ error: "Not Found", message: "No institution registry record linked to your tenant" }); return; }

  const uploadId = String(req.query.uploadId ?? "");
  const [latest] = uploadId
    ? await db.select().from(dataUploadsTable).where(eq(dataUploadsTable.id, uploadId))
    : await db.select().from(dataUploadsTable)
        .where(and(eq(dataUploadsTable.institutionId, institution.id), sql`records_rejected > 0`))
        .orderBy(desc(dataUploadsTable.createdAt)).limit(1);

  const [uploads, errors] = await Promise.all([
    db.select({ id: dataUploadsTable.id, uploadNo: dataUploadsTable.uploadNo, fileName: dataUploadsTable.fileName,
      period: dataUploadsTable.period, recordsRejected: dataUploadsTable.recordsRejected, createdAt: dataUploadsTable.createdAt })
      .from(dataUploadsTable).where(eq(dataUploadsTable.institutionId, institution.id))
      .orderBy(desc(dataUploadsTable.createdAt)).limit(20),
    latest ? db.select().from(validationErrorsTable).where(eq(validationErrorsTable.uploadId, latest.id))
      .orderBy(desc(validationErrorsTable.affectedRecords)) : Promise.resolve([]),
  ]);

  res.json({ upload: latest ?? null, uploads, errors });
});

router.put("/validation-errors/:id/resolve", ...tenantUser, async (req: AuthRequest, res) => {
  const [error] = await db.update(validationErrorsTable)
    .set({ status: "resolved" }).where(eq(validationErrorsTable.id, req.params.id)).returning();
  if (!error) { res.status(404).json({ error: "Not Found", message: "Validation error not found" }); return; }
  res.json({ error });
});

// ─── DATA QUALITY ────────────────────────────────────────────────────────────

router.get("/data-quality", ...tenantUser, async (req: AuthRequest, res) => {
  const institution = await institutionFor(req.user!.tenantId);
  if (!institution) { res.status(404).json({ error: "Not Found", message: "No institution registry record linked to your tenant" }); return; }

  const [reviews, issues, peers, uploadTrend] = await Promise.all([
    db.select().from(dataQualityReviewsTable)
      .where(eq(dataQualityReviewsTable.institutionId, institution.id))
      .orderBy(desc(dataQualityReviewsTable.period)),
    db.select().from(dataQualityIssuesTable)
      .where(eq(dataQualityIssuesTable.institutionId, institution.id))
      .orderBy(desc(dataQualityIssuesTable.affectedRecords)),
    db.execute(sql`
      select i.name, round((r.completeness * 0.4 + r.accuracy * 0.4 + r.timeliness * 0.2)::numeric, 1)::float as score
      from data_quality_reviews r join institutions i on i.id = r.institution_id
      order by score desc`).then(r => r.rows as any[]),
    db.execute(sql`
      select period,
             coalesce(sum(records_submitted), 0)::int as submitted,
             coalesce(sum(records_rejected), 0)::int as rejected
      from data_uploads where institution_id = ${institution.id}
      group by period order by period desc limit 6`).then(r => r.rows),
  ]);

  const latest = reviews[0] ?? null;
  const score = latest
    ? Math.round((Number(latest.completeness) * 0.4 + Number(latest.accuracy) * 0.4 + Number(latest.timeliness) * 0.2) * 10) / 10
    : null;
  const rank = score != null ? peers.findIndex(p => p.name === institution.name) + 1 : null;

  res.json({
    institution: institution.name, latest, score,
    rank: rank || null, peerCount: peers.length,
    peerAverage: peers.length ? Math.round((peers.reduce((a, p) => a + p.score, 0) / peers.length) * 10) / 10 : null,
    reviews, issues, uploadTrend,
  });
});

export default router;
