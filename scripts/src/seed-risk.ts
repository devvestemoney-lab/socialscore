import { db, creditScoresTable, alertsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

let s = 17;
const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const ratingFor = (x: number) => (x >= 720 ? "Excellent" : x >= 660 ? "Good" : x >= 580 ? "Fair" : x >= 480 ? "Poor" : "Very Poor") as "Excellent";

async function run() {
  console.log("Seeding risk & intelligence data...");
  const [{ n }] = (await db.execute(sql`
    select count(*)::int as n from (
      select customer_id from credit_scores group by customer_id having count(*) > 1
    ) t`)).rows as any[];
  if (n > 10) { console.log("Score history already present. Skipping."); process.exit(0); }

  // ── Prior score per scored consumer → real segment-migration data ──
  const latest = (await db.execute(sql`
    select distinct on (customer_id) customer_id, round(score)::int as score
    from credit_scores order by customer_id, created_at desc
  `)).rows as any[];

  const priorRows = latest.map(row => {
    // ~55% stable, ~25% were worse before (improving), ~20% were better (deteriorating)
    const r = rand();
    const drift = r < 0.55 ? between(-15, 15) : r < 0.8 ? -between(30, 110) : between(30, 110);
    const prev = Math.max(310, Math.min(845, row.score + drift));
    return {
      customerId: row.customer_id,
      score: String(prev),
      rating: ratingFor(prev),
      probabilityOfDefault: String(Math.min(0.95, Math.max(0.005, (850 - prev) / 850))),
      scoreBreakdown: { repaymentHistory: between(40, 100), loanDefaults: between(40, 100), transactionPatterns: between(40, 100), mobileMoney: between(40, 100), accountAge: between(40, 100) },
      recommendation: prev >= 660 ? "Approve within standard limits" : prev >= 580 ? "Approve with conditions" : "Manual review recommended",
      createdAt: daysAgo(between(65, 120)),
    };
  });
  await db.insert(creditScoresTable).values(priorRows);
  console.log(`  ✓ ${priorRows.length} prior scores (migration history)`);

  // ── Historical alerts (resolved) for MTTR + a manual open one ──
  await db.insert(alertsTable).values([
    { severity: "high", title: "Query velocity anomaly — 340% above baseline (Madison Finance)", source: "Fraud Detection", scope: "Madison Finance", status: "resolved", createdAt: daysAgo(9), resolvedAt: daysAgo(8.6) },
    { severity: "medium", title: "PSI drift 0.11 on Mobile Money Micro v1.3 scorecard", source: "Model Monitoring", scope: "Platform", status: "resolved", createdAt: daysAgo(6), resolvedAt: daysAgo(5.4) },
    { severity: "low", title: "14 user invites pending for more than 7 days", source: "Users & Access", scope: "Multiple tenants", status: "resolved", createdAt: daysAgo(4), resolvedAt: daysAgo(3.8) },
    { severity: "medium", title: "Identity Matching throughput below 2.5k rec/s for 4 hours", source: "Data Processing", scope: "Platform", status: "acknowledged", createdAt: daysAgo(0.4) },
  ]);
  console.log("  ✓ 4 baseline alerts");
  console.log("Done.");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
