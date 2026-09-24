import { db, scorecardsTable, abTestsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const ago = (d: number) => new Date(Date.now() - d * 86_400_000);

async function run() {
  console.log("Seeding scorecards...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from scorecards`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  /** Weights across the seven scoring dimensions, in the order they are listed in dimensions.ts */
  const W = (credit: number, payments: number, housing: number, cashflow: number, peer: number, commerce: number, stability: number) => ({
    credit, payments, housing, cashflow, peer, commerce, stability,
  });
  const T = (approve: number, review: number, decline: number, lti = 0.4) => ({
    autoApprove: approve, manualReview: review, autoDecline: decline, maxLoanToIncome: lti,
  });

  const cards = await db.insert(scorecardsTable).values([
    { name: "SocialScore Consumer", version: "v4.2", segment: "consumer", status: "production",
      weights: W(28, 17, 15, 15, 12, 7, 6), thresholds: T(660, 580, 480),
      gini: "0.610", ks: "0.480", psi: "0.040", owner: "Risk Analytics",
      notes: "Seven-dimension card: credit, payments (incl. refuse collection), housing, mobile money cash flow, peer lending, commerce, stability.",
      deployedAt: ago(24), createdBy: "Grace Zulu" },
    { name: "SocialScore Consumer", version: "v4.1", segment: "consumer", status: "retired",
      weights: W(34, 19, 16, 0, 0, 22, 9), thresholds: T(670, 590, 480),
      gini: "0.580", ks: "0.450", psi: "0.090", owner: "Risk Analytics",
      notes: "Superseded by v4.2, which added cash flow and peer lending.",
      deployedAt: ago(215), retiredAt: ago(24), createdBy: "Grace Zulu" },
    { name: "SocialScore Consumer", version: "v4.3", segment: "consumer", status: "draft",
      weights: W(26, 16, 15, 18, 13, 7, 5), thresholds: T(660, 580, 480),
      gini: "0.625", ks: "0.495", psi: "0.020", owner: "Risk Analytics",
      notes: "Challenger candidate — heavier cash-flow weighting, pending validation sign-off.",
      createdBy: "Grace Zulu" },
    { name: "SocialScore SME", version: "v2.0", segment: "sme", status: "production",
      weights: W(32, 16, 12, 20, 8, 7, 5), thresholds: T(650, 570, 470, 0.35),
      gini: "0.540", ks: "0.410", psi: "0.060", owner: "Risk Analytics",
      notes: "Built on the SME development sample; turnover-linked affordability applied downstream.",
      deployedAt: ago(80), createdBy: "Grace Zulu" },
    { name: "Mobile Money Micro", version: "v1.3", segment: "micro", status: "monitoring",
      weights: W(15, 20, 10, 35, 15, 3, 2), thresholds: T(640, 560, 460, 0.25),
      gini: "0.490", ks: "0.370", psi: "0.110", owner: "Risk Analytics",
      notes: "PSI above the 0.10 tolerance — population drift under review before the next cycle.",
      deployedAt: ago(59), createdBy: "Grace Zulu" },
    { name: "Thin File Starter", version: "v1.0", segment: "thin_file", status: "draft",
      weights: W(5, 25, 20, 25, 15, 5, 5), thresholds: T(650, 580, 480, 0.2),
      gini: "0.420", ks: "0.310", psi: null as any, owner: "Risk Analytics",
      notes: "Experimental card for consumers with fewer than three tradelines.",
      createdBy: "Grace Zulu" },
  ]).returning();
  console.log(`  ✓ ${cards.length} scorecards`);

  const champion = cards.find(c => c.version === "v4.2")!;
  const challenger = cards.find(c => c.version === "v4.3")!;
  await db.insert(abTestsTable).values({
    segment: "consumer", championId: champion.id, challengerId: challenger.id,
    challengerTrafficPct: "20", enabled: true, startedAt: ago(11),
  });
  console.log("  ✓ 1 A/B test (consumer: v4.2 vs v4.3 @ 20%)");
  console.log("Done.");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
