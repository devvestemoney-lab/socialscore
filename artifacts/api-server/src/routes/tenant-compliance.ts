import { Router, type IRouter } from "express";
import {
  db, tenantsTable, creditInquiriesTable, creditReportsTable, consentsTable,
  disputesTable, usersTable, customersTable, dataSubmissionsTable, institutionsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;

const REPORTS = [
  { key: "inquiry_purpose", name: "Monthly Inquiry & Purpose Report", type: "BoZ regulatory",
    description: "Every inquiry made in the period with its stated permissible purpose and outcome." },
  { key: "consent_compliance", name: "Consent Compliance Summary", type: "Data Protection Act",
    description: "Consent coverage across inquiries, including any pulls declined for want of consent." },
  { key: "dispute_handling", name: "Dispute Handling Report", type: "BoZ regulatory",
    description: "Disputes lodged against your records, response times and outcomes against the 21-day window." },
  { key: "access_review", name: "User Access Review Pack", type: "Internal audit",
    description: "Workspace users, roles, MFA posture and last-login evidence for periodic access certification." },
  { key: "data_quality", name: "Data Quality Certificate", type: "Bureau attestation",
    description: "Submission history, acceptance rates and rejection analysis for your contributed data." },
];

/** Period helper: 'YYYY-MM' → [start, end) */
function periodRange(period: string) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  const end = new Date(Date.UTC(y, (m ?? 1), 1));
  return { start, end };
}

router.get("/compliance-reports", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  res.json({ reports: REPORTS, periods });
});

/** Generate a report from live workspace data */
router.post("/compliance-reports/:key/generate", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const definition = REPORTS.find(r => r.key === req.params.key);
  if (!definition) { res.status(404).json({ error: "Not Found", message: "Unknown report" }); return; }

  const period = String(req.body?.period ?? new Date().toISOString().slice(0, 7));
  const { start, end } = periodRange(period);
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  const institution = tenant?.name ?? "";
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

  const meta = {
    reference: `${definition.key.toUpperCase().slice(0, 4)}-${period.replace("-", "")}-${Math.floor(Math.random() * 900 + 100)}`,
    name: definition.name, type: definition.type, period, institution,
    generatedAt: new Date().toISOString(), generatedBy: user?.name ?? "",
  };

  if (definition.key === "inquiry_purpose") {
    const [[totals], byPurpose, byOutcome] = await Promise.all([
      db.select({
        total: sql<number>`count(*)::int`,
        hard: sql<number>`count(*) filter (where kind = 'hard')::int`,
        soft: sql<number>`count(*) filter (where kind = 'soft')::int`,
        consumers: sql<number>`count(distinct customer_id)::int`,
      }).from(creditInquiriesTable)
        .where(and(eq(creditInquiriesTable.tenantId, tenantId), sql`created_at >= ${start} and created_at < ${end}`)),
      db.execute(sql`select purpose, count(*)::int as n from credit_inquiries
        where tenant_id = ${tenantId} and created_at >= ${start} and created_at < ${end}
        group by purpose order by n desc limit 12`).then(r => r.rows),
      db.execute(sql`select outcome, count(*)::int as n from credit_inquiries
        where tenant_id = ${tenantId} and created_at >= ${start} and created_at < ${end}
        group by outcome`).then(r => r.rows),
    ]);
    res.json({ meta, sections: [
      { title: "Inquiry Totals", kind: "stats", stats: [
        { label: "Total inquiries", value: totals.total }, { label: "Hard inquiries", value: totals.hard },
        { label: "Soft inquiries", value: totals.soft }, { label: "Distinct consumers", value: totals.consumers },
      ]},
      { title: "Inquiries by Stated Purpose", kind: "table", head: ["Purpose", "Count"],
        rows: byPurpose.map((r: any) => [r.purpose, r.n]) },
      { title: "Outcomes", kind: "table", head: ["Outcome", "Count"],
        rows: byOutcome.map((r: any) => [String(r.outcome).replace(/_/g, " "), r.n]) },
    ], attestation: "All inquiries listed were made for a permissible purpose under the Bank of Zambia credit reporting directives." });
    return;
  }

  if (definition.key === "consent_compliance") {
    const [[inq], [consents]] = await Promise.all([
      db.select({
        hard: sql<number>`count(*) filter (where kind = 'hard')::int`,
        declined: sql<number>`count(*) filter (where outcome = 'declined_no_consent')::int`,
      }).from(creditInquiriesTable)
        .where(and(eq(creditInquiriesTable.tenantId, tenantId), sql`created_at >= ${start} and created_at < ${end}`)),
      db.select({
        granted: sql<number>`count(*) filter (where granted_at >= ${start} and granted_at < ${end})::int`,
        revoked: sql<number>`count(*) filter (where revoked_at >= ${start} and revoked_at < ${end})::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
        expiring: sql<number>`count(*) filter (where status = 'active' and expires_at < now() + interval '30 days')::int`,
      }).from(consentsTable).where(eq(consentsTable.tenantId, tenantId)),
    ]);
    const compliance = inq.hard > 0 ? (((inq.hard - inq.declined) / inq.hard) * 100).toFixed(1) : "100.0";
    res.json({ meta, sections: [
      { title: "Consent Position", kind: "stats", stats: [
        { label: "Active consents held", value: consents.active }, { label: "Granted in period", value: consents.granted },
        { label: "Revoked in period", value: consents.revoked }, { label: "Expiring within 30 days", value: consents.expiring },
      ]},
      { title: "Consent Enforcement on Inquiries", kind: "stats", stats: [
        { label: "Hard inquiries attempted", value: inq.hard },
        { label: "Declined for want of consent", value: inq.declined },
        { label: "Consent compliance rate", value: `${compliance}%` },
      ]},
    ], attestation: "Consent evidence is retained in accordance with the Data Protection Act (2021). Inquiries without valid consent were refused by the bureau." });
    return;
  }

  if (definition.key === "dispute_handling") {
    const [[stats], byType, cases] = await Promise.all([
      db.select({
        opened: sql<number>`count(*) filter (where opened_at >= ${start} and opened_at < ${end})::int`,
        resolved: sql<number>`count(*) filter (where resolved_at >= ${start} and resolved_at < ${end})::int`,
        upheld: sql<number>`count(*) filter (where resolved_at >= ${start} and resolved_at < ${end} and status = 'resolved_upheld')::int`,
        openNow: sql<number>`count(*) filter (where resolved_at is null)::int`,
        breached: sql<number>`count(*) filter (where resolved_at is null and due_at < now())::int`,
        avgDays: sql<number>`coalesce(round(avg(extract(epoch from (resolved_at - opened_at)) / 86400) filter (where resolved_at is not null))::int, 0)`,
      }).from(disputesTable).where(eq(disputesTable.institutionName, institution)),
      db.execute(sql`select type, count(*)::int as n from disputes where institution_name = ${institution} group by type order by n desc`).then(r => r.rows),
      db.execute(sql`select case_no, type, status, to_char(opened_at,'DD Mon YYYY') as opened,
          coalesce(to_char(resolved_at,'DD Mon YYYY'), '—') as resolved
        from disputes where institution_name = ${institution} order by opened_at desc limit 20`).then(r => r.rows),
    ]);
    res.json({ meta, sections: [
      { title: "Dispute Performance", kind: "stats", stats: [
        { label: "Opened in period", value: stats.opened }, { label: "Resolved in period", value: stats.resolved },
        { label: "Upheld (record corrected)", value: stats.upheld }, { label: "Currently open", value: stats.openNow },
        { label: "Past 21-day SLA", value: stats.breached }, { label: "Avg resolution (days)", value: stats.avgDays },
      ]},
      { title: "Disputes by Type", kind: "table", head: ["Dispute type", "Count"], rows: byType.map((r: any) => [r.type, r.n]) },
      { title: "Case Register", kind: "table", head: ["Case", "Type", "Status", "Opened", "Resolved"],
        rows: cases.map((r: any) => [r.case_no, r.type, String(r.status).replace(/_/g, " "), r.opened, r.resolved]) },
    ], attestation: "Disputes are handled within the 21-day statutory window prescribed by the Bank of Zambia credit reporting directives." });
    return;
  }

  if (definition.key === "access_review") {
    const users = await db.select({
      name: usersTable.name, email: usersTable.email, role: usersTable.role,
      status: usersTable.status, mfa: usersTable.mfaEnabled, lastLoginAt: usersTable.lastLoginAt,
    }).from(usersTable).where(eq(usersTable.tenantId, tenantId));
    const mfaPct = users.length ? Math.round((users.filter(u => u.mfa).length / users.length) * 100) : 0;
    const stale = users.filter(u => !u.lastLoginAt || Date.now() - new Date(u.lastLoginAt).getTime() > 60 * 86_400_000).length;
    res.json({ meta, sections: [
      { title: "Access Posture", kind: "stats", stats: [
        { label: "Workspace users", value: users.length },
        { label: "Active", value: users.filter(u => u.status === "active").length },
        { label: "MFA coverage", value: `${mfaPct}%` },
        { label: "Dormant (60d+)", value: stale },
      ]},
      { title: "User Register", kind: "table", head: ["User", "Email", "Role", "Status", "MFA", "Last login"],
        rows: users.map(u => [u.name, u.email, u.role.replace(/_/g, " "), u.status, u.mfa ? "Enabled" : "Off",
          u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Never"]) },
    ], attestation: "This pack evidences periodic user access certification for the stated period." });
    return;
  }

  // data_quality
  const [institutionRow] = await db.select().from(institutionsTable).where(eq(institutionsTable.name, institution));
  const submissions = institutionRow
    ? await db.select().from(dataSubmissionsTable).where(eq(dataSubmissionsTable.institutionId, institutionRow.id))
    : [];
  const submitted = submissions.reduce((a, s) => a + s.recordsSubmitted, 0);
  const accepted = submissions.reduce((a, s) => a + s.recordsAccepted, 0);
  const rejected = submissions.reduce((a, s) => a + s.recordsRejected, 0);
  res.json({ meta, sections: [
    { title: "Contribution Summary", kind: "stats", stats: [
      { label: "Cycles submitted", value: submissions.length },
      { label: "Records submitted", value: submitted.toLocaleString() },
      { label: "Accepted", value: accepted.toLocaleString() },
      { label: "Acceptance rate", value: submitted ? `${((accepted / submitted) * 100).toFixed(2)}%` : "—" },
      { label: "Rejected", value: rejected.toLocaleString() },
    ]},
    { title: "Submission History", kind: "table", head: ["Period", "Submitted", "Accepted", "Rejected", "Status"],
      rows: submissions.sort((a, b) => b.period.localeCompare(a.period))
        .map(s => [s.period, s.recordsSubmitted.toLocaleString(), s.recordsAccepted.toLocaleString(), s.recordsRejected.toLocaleString(), s.status]) },
  ], attestation: "Data contributed to the bureau is complete, accurate and submitted within the prescribed reporting cycle." });
});

export default router;
