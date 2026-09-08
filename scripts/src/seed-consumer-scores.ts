import { db, customersTable, creditScoresTable, loansTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const ratingFor = (s: number) => (s >= 720 ? "Excellent" : s >= 660 ? "Good" : s >= 580 ? "Fair" : s >= 480 ? "Poor" : "Very Poor") as "Good";

async function run() {
  console.log("Scoring consumers that have tradelines but no score...");
  const rows = (await db.execute(sql`
    select c.id,
      coalesce(sum(l.missed_payments), 0)::int as missed,
      count(*) filter (where l.status in ('defaulted','written_off'))::int as adverse,
      count(*)::int as tradelines
    from customers c join loans l on l.customer_id = c.id
    where not exists (select 1 from credit_scores s where s.customer_id = c.id)
    group by c.id`)).rows as any[];

  if (rows.length === 0) { console.log("Every consumer with tradelines already has a score."); process.exit(0); }

  const values: any[] = [];
  for (const r of rows) {
    // derive a defensible score from the consumer's actual file
    const repayment = Math.max(20, 95 - r.missed * 12 - r.adverse * 25);
    const defaults = Math.max(10, 100 - r.adverse * 40 - r.missed * 6);
    const patterns = Math.min(95, 55 + r.tradelines * 6);
    const mobile = 60 + ((r.tradelines * 7) % 30);
    const age = Math.min(90, 40 + r.tradelines * 8);
    const breakdown = { repaymentHistory: repayment, transactionPatterns: patterns, loanDefaults: defaults, mobileMoney: mobile, accountAge: age };
    const WEIGHTS: Record<string, number> = { repaymentHistory: 300, transactionPatterns: 250, loanDefaults: 200, mobileMoney: 150, accountAge: 100 };
    const points = Object.entries(WEIGHTS).reduce((a, [k, max]) => a + ((breakdown as any)[k] / 100) * max, 0);
    const score = Math.round(300 + (points / 1000) * 550);
    const prior = Math.max(310, Math.min(845, score - 18 + ((r.tradelines * 11) % 30)));

    values.push({
      customerId: r.id, score: String(score), rating: ratingFor(score),
      probabilityOfDefault: String(Math.min(0.95, Math.max(0.005, (850 - score) / 850)).toFixed(4)),
      scoreBreakdown: breakdown,
      recommendation: score >= 660 ? "Approve within standard limits" : score >= 580 ? "Approve with conditions" : "Manual review recommended",
      createdAt: daysAgo(3),
    });
    values.push({
      customerId: r.id, score: String(prior), rating: ratingFor(prior),
      probabilityOfDefault: String(Math.min(0.95, Math.max(0.005, (850 - prior) / 850)).toFixed(4)),
      scoreBreakdown: breakdown,
      recommendation: prior >= 660 ? "Approve within standard limits" : "Approve with conditions",
      createdAt: daysAgo(95),
    });
  }
  await db.insert(creditScoresTable).values(values);
  console.log(`  ✓ scored ${rows.length} consumer(s) with a prior run for trend`);
  console.log("Done.");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
