import {
  db, institutionsTable, dataSubmissionsTable, dataQualityReviewsTable,
  dataQualityIssuesTable, processingJobsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

let s = 7;
const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function run() {
  console.log("Seeding data-ecosystem data...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from data_submissions`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  const institutions = await db.select().from(institutionsTable);
  const volumeFor = (type: string) =>
    type === "mobile_money" ? between(850_000, 1_100_000)
    : type === "commercial_bank" ? between(180_000, 420_000)
    : type === "utility" ? between(60_000, 120_000)
    : between(40_000, 130_000);

  // ── Submissions: last 3 periods ──
  const rows: any[] = [];
  for (const [pIdx, period] of ["2026-08", "2026-07", "2026-06"].entries()) {
    for (const inst of institutions) {
      if (inst.status === "onboarding" && period !== "2026-08") continue;
      const submitted = volumeFor(inst.type);
      // current period: Madison overdue, FINCA still processing, MTN partial
      if (period === "2026-08" && inst.name.includes("Madison")) {
        rows.push({ institutionId: inst.id, period, recordsSubmitted: 0, recordsAccepted: 0, recordsRejected: 0, status: "overdue", submittedAt: null });
        continue;
      }
      if (period === "2026-08" && inst.name.includes("FINCA")) {
        rows.push({ institutionId: inst.id, period, recordsSubmitted: submitted, recordsAccepted: 0, recordsRejected: 0, status: "processing", submittedAt: daysAgo(0) });
        continue;
      }
      const rejectPct = period === "2026-08" && inst.type === "mobile_money" && inst.name.includes("MTN") ? 0.04 : rand() * 0.012;
      const rejectedN = Math.floor(submitted * rejectPct);
      rows.push({
        institutionId: inst.id, period,
        recordsSubmitted: submitted, recordsAccepted: submitted - rejectedN, recordsRejected: rejectedN,
        status: rejectedN > submitted * 0.02 ? "partial" : "accepted",
        submittedAt: daysAgo(pIdx * 30 + between(1, 4)),
      });
    }
  }
  await db.insert(dataSubmissionsTable).values(rows);
  console.log(`  ✓ ${rows.length} submissions across 3 periods`);

  // ── Quality reviews (latest period) ──
  const qRows = institutions.filter(i => i.status !== "onboarding").map(inst => {
    const base = inst.type === "commercial_bank" ? between(95, 99) : inst.type === "mobile_money" ? between(88, 95) : between(87, 96);
    return {
      institutionId: inst.id, period: "2026-08",
      completeness: String(base + rand() * 1.5 - 0.7).slice(0, 5),
      accuracy: String(base + rand() * 2 - 1).slice(0, 5),
      timeliness: String(inst.name.includes("Madison") ? between(40, 60) : between(90, 100)),
    };
  });
  await db.insert(dataQualityReviewsTable).values(qRows);

  const byName = (frag: string) => institutions.find(i => i.name.includes(frag))?.id ?? null;
  await db.insert(dataQualityIssuesTable).values([
    { institutionId: byName("MTN"), sourceLabel: "MTN Mobile Money", issue: "Missing NRC on tradeline records", affectedRecords: 18422, severity: "high" },
    { institutionId: null, sourceLabel: "Multiple sources", issue: "Invalid date of birth (future / under-18)", affectedRecords: 6210, severity: "high" },
    { institutionId: byName("Absa"), sourceLabel: "Absa Bank Zambia", issue: "Duplicate account references in batch", affectedRecords: 4874, severity: "medium" },
    { institutionId: byName("FINCA"), sourceLabel: "FINCA Zambia", issue: "Currency amounts missing decimals", affectedRecords: 3391, severity: "medium" },
    { institutionId: byName("Bayport"), sourceLabel: "Bayport Financial Services", issue: "Stale closed-account status not reported", affectedRecords: 2016, severity: "low" },
    { institutionId: byName("Airtel"), sourceLabel: "Airtel Money Zambia", issue: "Phone numbers in legacy 09x format", affectedRecords: 1204, severity: "low" },
  ]);
  console.log(`  ✓ ${qRows.length} quality reviews, 6 issues`);

  // ── Processing jobs ──
  let no = 77101;
  const mk = (type: string, source: string, records: number, status: string, startedDaysAgo: number, extra: any = {}) => ({
    jobNo: `JOB-${no++}`, type, source, records, status,
    progress: ["completed", "completed_with_errors"].includes(status) ? 100 : extra.progress ?? 0,
    ratePctPerSec: extra.rate ?? "2",
    startedAt: daysAgo(startedDaysAgo),
    completedAt: ["completed", "completed_with_errors", "failed", "cancelled"].includes(status) ? daysAgo(startedDaysAgo - 0.02) : null,
    createdAt: daysAgo(startedDaysAgo),
  });
  await db.insert(processingJobsTable).values([
    mk("Monthly Batch Load", "Madison Finance · Jul 2026", 38119, "failed", 6, { progress: 14 }),
    mk("Score Refresh", "SocialScore Consumer v4.2", 1081552, "completed", 3),
    mk("Monthly Batch Load", "MTN MoMo · Aug 2026", 1094820, "completed_with_errors", 2),
    mk("Dedupe Sweep", "Absa Bank batch #4451", 301776, "completed", 2),
    mk("Monthly Batch Load", "Airtel Money · Aug 2026", 887215, "completed", 1),
    mk("Monthly Batch Load", "Zanaco Bank · Aug 2026", 412330, "completed", 1),
    { jobNo: `JOB-${no++}`, type: "Identity Rematch", source: "Registry-wide (thin files)", records: 203378, status: "running", progress: 0, ratePctPerSec: "0.02", startedAt: new Date(), completedAt: null, createdAt: new Date() },
    { jobNo: `JOB-${no++}`, type: "Monthly Batch Load", source: "FINCA Zambia · Aug 2026", records: 44108, status: "queued", progress: 0, ratePctPerSec: "1.5", startedAt: null, completedAt: null, createdAt: new Date() },
  ]);
  console.log("  ✓ 8 processing jobs");
  console.log("Done.");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
