import { Router, type IRouter } from "express";
import {
  db, scorecardsTable, abTestsTable, fraudCasesTable, tenantsTable,
  usersTable, creditInquiriesTable, creditScoresTable, insertScorecardSchema,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";
import { DIMENSIONS } from "../lib/dimensions.js";

const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")] as const;

/** The weight editor is driven by the scoring dimensions themselves, so a
 *  dimension added to the model appears here without a UI change. */
export const FACTORS = DIMENSIONS.map(d => ({
  key: d.key, label: d.label, max: d.weight * 10, description: d.description,
}));

// ─── SCORECARDS ──────────────────────────────────────────────────────────────

router.get("/scorecards", ...superAdmin, async (_req, res) => {
  const [cards, tests, [population]] = await Promise.all([
    db.select().from(scorecardsTable).orderBy(desc(scorecardsTable.status), desc(scorecardsTable.deployedAt)),
    db.select().from(abTestsTable),
    db.execute(sql`
      select count(*)::int as scored,
             coalesce(round(avg(score))::int, 0) as avg_score
      from (select distinct on (customer_id) customer_id, score from credit_scores order by customer_id, created_at desc) t`)
      .then(r => r.rows as any[]),
  ]);
  const production = cards.filter(c => c.status === "production");
  res.json({
    scorecards: cards, abTests: tests, factors: FACTORS,
    summary: {
      total: cards.length,
      production: production.length,
      monitoring: cards.filter(c => c.status === "monitoring").length,
      drift: cards.filter(c => c.psi != null && Number(c.psi) > 0.1).length,
      scoredPopulation: population.scored ?? 0,
      avgScore: population.avg_score ?? 0,
      avgGini: production.length
        ? Math.round((production.reduce((a, c) => a + Number(c.gini ?? 0), 0) / production.length) * 1000) / 1000
        : 0,
    },
  });
});

router.get("/scorecards/:id", ...superAdmin, async (req, res) => {
  const [card] = await db.select().from(scorecardsTable).where(eq(scorecardsTable.id, req.params.id));
  if (!card) { res.status(404).json({ error: "Not Found", message: "Scorecard not found" }); return; }
  const [versions, [test], bands] = await Promise.all([
    db.select().from(scorecardsTable).where(eq(scorecardsTable.name, card.name)).orderBy(desc(scorecardsTable.createdAt)),
    db.select().from(abTestsTable).where(eq(abTestsTable.segment, card.segment)),
    db.execute(sql`
      select case when score >= 720 then 'A' when score >= 660 then 'B'
                  when score >= 580 then 'C' when score >= 480 then 'D' else 'E' end as band,
             count(*)::int as n
      from (select distinct on (customer_id) customer_id, score from credit_scores order by customer_id, created_at desc) t
      group by 1 order by 1`).then(r => r.rows),
  ]);
  res.json({ scorecard: card, versions, abTest: test ?? null, bands, factors: FACTORS });
});

router.put("/scorecards/:id", ...superAdmin, async (req, res) => {
  const { weights, thresholds, notes, gini, ks, psi } = req.body ?? {};
  if (weights) {
    const total = Object.values(weights as Record<string, number>).reduce((a, b) => a + Number(b), 0);
    if (Math.abs(total - 100) > 0.01) {
      res.status(400).json({ error: "Bad Request", message: `Weights must total 100% — currently ${total}%` });
      return;
    }
  }
  if (thresholds) {
    const { autoApprove, manualReview, autoDecline } = thresholds;
    if (!(autoDecline < manualReview && manualReview < autoApprove)) {
      res.status(400).json({ error: "Bad Request", message: "Thresholds must ascend: auto-decline < manual review < auto-approve" });
      return;
    }
  }
  const [card] = await db.update(scorecardsTable)
    .set({
      ...(weights ? { weights } : {}), ...(thresholds ? { thresholds } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(gini !== undefined ? { gini: String(gini) } : {}),
      ...(ks !== undefined ? { ks: String(ks) } : {}),
      ...(psi !== undefined ? { psi: String(psi) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(scorecardsTable.id, req.params.id)).returning();
  if (!card) { res.status(404).json({ error: "Not Found", message: "Scorecard not found" }); return; }
  res.json({ scorecard: card });
});

/** Clone the current card into a new draft version */
router.post("/scorecards/:id/version", ...superAdmin, async (req: AuthRequest, res) => {
  const [base] = await db.select().from(scorecardsTable).where(eq(scorecardsTable.id, req.params.id));
  if (!base) { res.status(404).json({ error: "Not Found", message: "Scorecard not found" }); return; }
  const version = String(req.body?.version ?? "").trim();
  if (!/^v\d+\.\d+(\.\d+)?$/.test(version)) {
    res.status(400).json({ error: "Bad Request", message: "Version must look like v4.3 or v4.3.0" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  try {
    const [card] = await db.insert(scorecardsTable).values({
      name: base.name, version, segment: base.segment, status: "draft",
      weights: base.weights, thresholds: base.thresholds,
      notes: String(req.body?.notes ?? `Derived from ${base.version}`),
      owner: base.owner, createdBy: user?.name ?? "",
    }).returning();
    res.status(201).json({ scorecard: card });
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ error: "Conflict", message: "That version already exists" }); return; }
    throw e;
  }
});

/** Promote a draft to production, retiring the incumbent for that segment */
router.post("/scorecards/:id/promote", ...superAdmin, async (req, res) => {
  const [card] = await db.select().from(scorecardsTable).where(eq(scorecardsTable.id, req.params.id));
  if (!card) { res.status(404).json({ error: "Not Found", message: "Scorecard not found" }); return; }
  if (card.status === "production") { res.status(400).json({ error: "Bad Request", message: "Already in production" }); return; }
  await db.update(scorecardsTable)
    .set({ status: "retired", retiredAt: new Date(), updatedAt: new Date() })
    .where(and(eq(scorecardsTable.segment, card.segment), eq(scorecardsTable.status, "production")));
  const [promoted] = await db.update(scorecardsTable)
    .set({ status: "production", deployedAt: new Date(), retiredAt: null, updatedAt: new Date() })
    .where(eq(scorecardsTable.id, card.id)).returning();
  res.json({ scorecard: promoted });
});

router.post("/scorecards/:id/retire", ...superAdmin, async (req, res) => {
  const [card] = await db.update(scorecardsTable)
    .set({ status: "retired", retiredAt: new Date(), updatedAt: new Date() })
    .where(eq(scorecardsTable.id, req.params.id)).returning();
  if (!card) { res.status(404).json({ error: "Not Found", message: "Scorecard not found" }); return; }
  res.json({ scorecard: card });
});

/** Configure the champion/challenger split for a segment */
router.put("/ab-tests/:segment", ...superAdmin, async (req, res) => {
  const { championId, challengerId, challengerTrafficPct = 0, enabled = false } = req.body ?? {};
  const pct = Number(challengerTrafficPct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
    res.status(400).json({ error: "Bad Request", message: "Challenger traffic must be between 0 and 50%" });
    return;
  }
  if (enabled && (!championId || !challengerId)) {
    res.status(400).json({ error: "Bad Request", message: "Both a champion and a challenger are required to run a test" });
    return;
  }
  const [test] = await db.insert(abTestsTable)
    .values({
      segment: req.params.segment, championId: championId ?? null, challengerId: challengerId ?? null,
      challengerTrafficPct: String(pct), enabled: Boolean(enabled), startedAt: enabled ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: abTestsTable.segment,
      set: {
        championId: championId ?? null, challengerId: challengerId ?? null,
        challengerTrafficPct: String(pct), enabled: Boolean(enabled),
        startedAt: enabled ? new Date() : null, updatedAt: new Date(),
      },
    }).returning();
  res.json({ abTest: test });
});

// ─── FRAUD & ABUSE (computed from real inquiry behaviour) ────────────────────

router.get("/fraud", ...superAdmin, async (_req, res) => {
  const rows = (await db.execute(sql`
    select t.id as tenant_id, t.name as tenant_name, t.type as tenant_type, t.status as tenant_status,
      count(q.id) filter (where q.created_at >= now() - interval '1 hour')::int as last_hour,
      count(q.id) filter (where q.created_at >= now() - interval '24 hours')::int as last_24h,
      count(q.id) filter (where q.created_at >= now() - interval '7 days')::int as last_7d,
      count(q.id)::int as total,
      count(distinct q.customer_id)::int as unique_consumers,
      count(q.id) filter (where q.outcome = 'declined_no_consent')::int as no_consent,
      count(q.id) filter (where q.kind = 'hard')::int as hard,
      count(q.id) filter (where extract(hour from q.created_at) not between 6 and 19)::int as off_hours,
      count(q.id) filter (where q.created_at >= now() - interval '30 days')::int as last_30d
    from tenants t left join credit_inquiries q on q.tenant_id = t.id
    group by t.id order by total desc`)).rows as any[];

  const cases = await db.select().from(fraudCasesTable);
  const caseMap = new Map(cases.map(c => [`${c.tenantId}:${c.signal}`, c]));

  const profiles = rows.map(r => {
    const repeatRatio = r.total > 0 ? 1 - r.unique_consumers / r.total : 0;
    const consentFailRate = r.total > 0 ? r.no_consent / r.total : 0;
    const offHoursRate = r.total > 0 ? r.off_hours / r.total : 0;
    const dailyAvg = r.last_30d / 30;
    const velocitySpike = dailyAvg > 0 ? r.last_24h / dailyAvg : 0;

    const signals: { key: string; label: string; severity: "critical" | "high" | "medium" }[] = [];
    if (r.last_hour > 50) signals.push({ key: "velocity_hour", label: `${r.last_hour} inquiries in the last hour`, severity: "critical" });
    if (velocitySpike >= 3 && r.last_24h >= 10) signals.push({ key: "velocity_spike", label: `24h volume ${velocitySpike.toFixed(1)}× the 30-day daily average`, severity: "high" });
    if (repeatRatio > 0.5 && r.total >= 10) signals.push({ key: "repeat_lookups", label: `${Math.round(repeatRatio * 100)}% of inquiries repeat the same consumers`, severity: "medium" });
    if (consentFailRate > 0.15 && r.total >= 10) signals.push({ key: "consent_failures", label: `${Math.round(consentFailRate * 100)}% of inquiries refused for missing consent`, severity: "high" });
    if (offHoursRate > 0.4 && r.total >= 10) signals.push({ key: "off_hours", label: `${Math.round(offHoursRate * 100)}% of activity outside business hours`, severity: "medium" });

    const open = signals.filter(s => (caseMap.get(`${r.tenant_id}:${s.key}`)?.status ?? "open") !== "cleared");
    const riskLevel = open.some(s => s.severity === "critical") ? "critical"
      : open.some(s => s.severity === "high") ? "high"
      : open.length > 0 ? "medium" : "normal";

    return {
      tenantId: r.tenant_id, tenantName: r.tenant_name, tenantType: r.tenant_type, tenantStatus: r.tenant_status,
      riskLevel,
      signals: signals.map(s => ({ ...s, ...(caseMap.get(`${r.tenant_id}:${s.key}`) ?? { status: "open", note: null }) })),
      metrics: {
        lastHour: r.last_hour, last24h: r.last_24h, last7d: r.last_7d, total: r.total,
        uniqueConsumers: r.unique_consumers, hard: r.hard,
        repeatRatio: Math.round(repeatRatio * 100),
        consentFailRate: Math.round(consentFailRate * 100),
        offHoursRate: Math.round(offHoursRate * 100),
        velocitySpike: Math.round(velocitySpike * 10) / 10,
      },
    };
  });

  const totalInquiries = rows.reduce((a, r) => a + r.total, 0);
  res.json({
    profiles,
    summary: {
      flagged: profiles.filter(p => p.riskLevel !== "normal").length,
      critical: profiles.filter(p => p.riskLevel === "critical").length,
      high: profiles.filter(p => p.riskLevel === "high").length,
      openSignals: profiles.reduce((a, p) => a + p.signals.filter((s: any) => s.status !== "cleared").length, 0),
      totalInquiries,
      consentRefusals: rows.reduce((a, r) => a + r.no_consent, 0),
    },
  });
});

router.put("/fraud/:tenantId/:signal", ...superAdmin, async (req: AuthRequest, res) => {
  const { status, note } = req.body ?? {};
  if (!["open", "investigating", "cleared", "escalated"].includes(status)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid status" }); return;
  }
  if (["cleared", "escalated"].includes(status) && !note) {
    res.status(400).json({ error: "Bad Request", message: "A note is required to clear or escalate a signal" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [row] = await db.insert(fraudCasesTable)
    .values({ tenantId: req.params.tenantId, signal: req.params.signal, status, note: note ?? null, updatedBy: user?.name ?? "" })
    .onConflictDoUpdate({
      target: [fraudCasesTable.tenantId, fraudCasesTable.signal],
      set: { status, note: note ?? null, updatedBy: user?.name ?? "", updatedAt: new Date() },
    }).returning();
  res.json({ case: row });
});

export default router;
