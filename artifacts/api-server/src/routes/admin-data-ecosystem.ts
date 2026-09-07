import { Router, type IRouter } from "express";
import {
  db, institutionsTable, dataSubmissionsTable, dataQualityReviewsTable,
  dataQualityIssuesTable, processingJobsTable,
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")] as const;

// ─── DATA CONTRIBUTIONS ──────────────────────────────────────────────────────

router.get("/data-contributions", ...superAdmin, async (req, res) => {
  const periods = (await db.selectDistinct({ period: dataSubmissionsTable.period }).from(dataSubmissionsTable)
    .orderBy(desc(dataSubmissionsTable.period))).map(r => r.period);
  const period = String(req.query.period ?? periods[0] ?? "");

  const submissions = await db.select({
    id: dataSubmissionsTable.id,
    institutionName: institutionsTable.name,
    institutionStatus: institutionsTable.status,
    period: dataSubmissionsTable.period,
    recordsSubmitted: dataSubmissionsTable.recordsSubmitted,
    recordsAccepted: dataSubmissionsTable.recordsAccepted,
    recordsRejected: dataSubmissionsTable.recordsRejected,
    status: dataSubmissionsTable.status,
    submittedAt: dataSubmissionsTable.submittedAt,
  })
    .from(dataSubmissionsTable)
    .innerJoin(institutionsTable, eq(dataSubmissionsTable.institutionId, institutionsTable.id))
    .where(eq(dataSubmissionsTable.period, period))
    .orderBy(desc(dataSubmissionsTable.recordsSubmitted));

  const received = submissions.filter(s => s.status !== "overdue").length;
  const ingested = submissions.reduce((a, s) => a + s.recordsAccepted, 0);
  const rejected = submissions.reduce((a, s) => a + s.recordsRejected, 0);

  res.json({
    period, periods, submissions,
    summary: {
      received, expected: submissions.length, ingested, rejected,
      rejectionRate: ingested + rejected > 0 ? Math.round((rejected / (ingested + rejected)) * 1000) / 10 : 0,
      onTimeRate: submissions.length ? Math.round((received / submissions.length) * 100) : 0,
    },
  });
});

/** Re-run validation on a partial/rejected batch: recovers most rejected records */
router.post("/data-contributions/:id/revalidate", ...superAdmin, async (req, res) => {
  const [s] = await db.select().from(dataSubmissionsTable).where(eq(dataSubmissionsTable.id, req.params.id));
  if (!s) {
    res.status(404).json({ error: "Not Found", message: "Submission not found" });
    return;
  }
  if (!["partial", "rejected"].includes(s.status)) {
    res.status(400).json({ error: "Bad Request", message: "Only partial or rejected submissions can be revalidated" });
    return;
  }
  const recovered = Math.floor(s.recordsRejected * 0.85);
  const remaining = s.recordsRejected - recovered;
  const [updated] = await db.update(dataSubmissionsTable).set({
    recordsAccepted: s.recordsAccepted + recovered,
    recordsRejected: remaining,
    status: remaining <= s.recordsSubmitted * 0.005 ? "accepted" : "partial",
  }).where(eq(dataSubmissionsTable.id, s.id)).returning();
  res.json({ submission: updated, recovered });
});

// ─── DATA QUALITY ────────────────────────────────────────────────────────────

router.get("/data-quality", ...superAdmin, async (_req, res) => {
  const reviews = await db.select({
    id: dataQualityReviewsTable.id,
    institutionName: institutionsTable.name,
    period: dataQualityReviewsTable.period,
    completeness: dataQualityReviewsTable.completeness,
    accuracy: dataQualityReviewsTable.accuracy,
    timeliness: dataQualityReviewsTable.timeliness,
  })
    .from(dataQualityReviewsTable)
    .innerJoin(institutionsTable, eq(dataQualityReviewsTable.institutionId, institutionsTable.id))
    .orderBy(desc(sql`(${dataQualityReviewsTable.completeness} * 0.4 + ${dataQualityReviewsTable.accuracy} * 0.4 + ${dataQualityReviewsTable.timeliness} * 0.2)`));

  const issues = await db.select({
    id: dataQualityIssuesTable.id,
    issue: dataQualityIssuesTable.issue,
    affectedRecords: dataQualityIssuesTable.affectedRecords,
    sourceLabel: dataQualityIssuesTable.sourceLabel,
    severity: dataQualityIssuesTable.severity,
    status: dataQualityIssuesTable.status,
  })
    .from(dataQualityIssuesTable)
    .orderBy(desc(sql`case ${dataQualityIssuesTable.severity} when 'high' then 3 when 'medium' then 2 else 1 end`), desc(dataQualityIssuesTable.affectedRecords));

  res.json({ reviews, issues });
});

router.put("/data-quality/issues/:id/resolve", ...superAdmin, async (req, res) => {
  const [issue] = await db.update(dataQualityIssuesTable)
    .set({ status: "resolved" })
    .where(eq(dataQualityIssuesTable.id, req.params.id))
    .returning();
  if (!issue) {
    res.status(404).json({ error: "Not Found", message: "Issue not found" });
    return;
  }
  res.json({ issue });
});

// ─── DATA PROCESSING ─────────────────────────────────────────────────────────

/** Lazily advance running jobs based on elapsed time; promote queued jobs */
async function advanceJobs() {
  const running = await db.select().from(processingJobsTable).where(eq(processingJobsTable.status, "running"));
  for (const job of running) {
    if (!job.startedAt) continue;
    const elapsed = (Date.now() - job.startedAt.getTime()) / 1000;
    const progress = Math.min(100, Math.floor(elapsed * Number(job.ratePctPerSec)));
    if (progress >= 100) {
      const errored = job.records > 500_000 && Math.random() < 0.3;
      await db.update(processingJobsTable)
        .set({ progress: 100, status: errored ? "completed_with_errors" : "completed", completedAt: new Date() })
        .where(eq(processingJobsTable.id, job.id));
    } else if (progress !== job.progress) {
      await db.update(processingJobsTable).set({ progress }).where(eq(processingJobsTable.id, job.id));
    }
  }
  // promote queued jobs while capacity remains (max 3 concurrent)
  const [stillRunning] = await db.select({ n: sql<number>`count(*)::int` }).from(processingJobsTable).where(eq(processingJobsTable.status, "running"));
  let capacity = 3 - stillRunning.n;
  if (capacity > 0) {
    const next = await db.select().from(processingJobsTable).where(eq(processingJobsTable.status, "queued")).orderBy(processingJobsTable.createdAt).limit(capacity);
    for (const job of next) {
      await db.update(processingJobsTable).set({ status: "running", startedAt: new Date(), progress: 0 }).where(eq(processingJobsTable.id, job.id));
    }
  }
}

router.get("/data-processing", ...superAdmin, async (_req, res) => {
  await advanceJobs();
  const jobs = await db.select().from(processingJobsTable).orderBy(desc(processingJobsTable.createdAt)).limit(30);

  const queuedOrRunning = (type: string) => jobs.filter(j => ["queued", "running"].includes(j.status) && j.type.includes(type)).length;
  const failed24h = jobs.filter(j => j.status === "failed" && Date.now() - j.createdAt.getTime() < 86_400_000).length;
  const stages = [
    { name: "Ingestion", throughput: "4.2k rec/s", queued: jobs.filter(j => j.status === "queued").length, state: "healthy" },
    { name: "Validation", throughput: "3.9k rec/s", queued: queuedOrRunning("Batch"), state: failed24h > 0 ? "degraded" : "healthy" },
    { name: "Identity Matching", throughput: "2.1k rec/s", queued: queuedOrRunning("Rematch"), state: queuedOrRunning("Rematch") > 0 ? "degraded" : "healthy" },
    { name: "Bureau Load", throughput: "3.4k rec/s", queued: 0, state: "healthy" },
  ];
  res.json({ stages, jobs });
});

const JOB_TEMPLATES: Record<string, { source: string; records: () => number; rate: number }> = {
  "Score Refresh": { source: "SocialScore Consumer v4.2", records: () => 112, rate: 4 },
  "Dedupe Sweep": { source: "Registry-wide", records: () => 125, rate: 5 },
  "Identity Rematch": { source: "Registry-wide (thin files)", records: () => 54, rate: 2.5 },
  "Data Quality Scan": { source: "All active feeds", records: () => 460, rate: 3 },
};

router.post("/data-processing/jobs", ...superAdmin, async (req, res) => {
  const type = String(req.body?.type ?? "");
  const template = JOB_TEMPLATES[type];
  if (!template) {
    res.status(400).json({ error: "Bad Request", message: `Unknown job type. Valid: ${Object.keys(JOB_TEMPLATES).join(", ")}` });
    return;
  }
  const [{ maxNo }] = await db.select({ maxNo: sql<number>`coalesce(max(substring(job_no from 5)::int), 77000)` }).from(processingJobsTable);
  const [running] = await db.select({ n: sql<number>`count(*)::int` }).from(processingJobsTable).where(eq(processingJobsTable.status, "running"));
  const hasCapacity = running.n < 3;
  const [job] = await db.insert(processingJobsTable).values({
    jobNo: `JOB-${Number(maxNo) + 1}`,
    type,
    source: template.source,
    records: template.records(),
    ratePctPerSec: String(template.rate),
    status: hasCapacity ? "running" : "queued",
    startedAt: hasCapacity ? new Date() : null,
  }).returning();
  res.status(201).json({ job });
});

router.post("/data-processing/jobs/:id/retry", ...superAdmin, async (req, res) => {
  const [job] = await db.select().from(processingJobsTable).where(eq(processingJobsTable.id, req.params.id));
  if (!job) {
    res.status(404).json({ error: "Not Found", message: "Job not found" });
    return;
  }
  if (!["failed", "cancelled", "completed_with_errors"].includes(job.status)) {
    res.status(400).json({ error: "Bad Request", message: "Only failed, cancelled or errored jobs can be retried" });
    return;
  }
  const [updated] = await db.update(processingJobsTable)
    .set({ status: "running", progress: 0, startedAt: new Date(), completedAt: null })
    .where(eq(processingJobsTable.id, job.id)).returning();
  res.json({ job: updated });
});

router.post("/data-processing/jobs/:id/cancel", ...superAdmin, async (req, res) => {
  const [job] = await db.update(processingJobsTable)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(and(eq(processingJobsTable.id, req.params.id), sql`status in ('queued','running')`))
    .returning();
  if (!job) {
    res.status(400).json({ error: "Bad Request", message: "Only queued or running jobs can be cancelled" });
    return;
  }
  res.json({ job });
});

export default router;
