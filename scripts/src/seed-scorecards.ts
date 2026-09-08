import { db, scorecardsTable, abTestsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const ago = (d: number) => new Date(Date.now() - d * 86_400_000);

async function run() {
  console.log("Seeding scorecards...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from scorecards`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  const W = (a: number, b: number, c: number, d: number, e: number) => ({
    repaymentHistory: a, transactionPatterns: b, loanDefaults: c, mobileMoney: d, accountAge: e,
  });
  const T = (approve: number, review: number, decline: number, lti = 0.4) => ({
    autoApprove: approve, manualReview: review, autoDecline: decline, maxLoanToIncome: lti,
  });

  const cards = await db.insert(scorecardsTable).values([
    { name: "SocialScore Consumer", version: "v4.2", segment: "consumer", status: "production",
      weights: W(30, 25, 20, 15, 10), thresholds: T(750, 500, 300),
      gini: "0.610", ks: "0.480", psi: "0.040", owner: "Risk Analytics",
      notes: "Recalibrated on the 2026 H1 development sample; mobile money weight increased for inclusion.",
      deployedAt: ago(24), createdBy: "Grace Zulu" },
    { name: "SocialScore Consumer", version: "v4.1", segment: "consumer", status: "retired",
      weights: W(35, 20, 25, 10, 10), thresholds: T(760, 520, 320),
      gini: "0.580", ks: "0.450", psi: "0.090", owner: "Risk Analytics",
      notes: "Superseded by v4.2 after PSI drift on the mobile-money population.",
      deployedAt: ago(215), retiredAt: ago(24), createdBy: "Grace Zulu" },
    { name: "SocialScore Consumer", version: "v4.3", segment: "consumer", status: "draft",
      weights: W(28, 27, 20, 15, 10), thresholds: T(740, 500, 300),
      gini: "0.625", ks: "0.495", psi: "0.020", owner: "Risk Analytics",
      notes: "Challenger candidate — heavier transaction-pattern weighting, pending validation sign-off.",
      createdBy: "Grace Zulu" },
    { name: "SocialScore SME", version: "v2.0", segment: "sme", status: "production",
      weights: W(30, 30, 20, 10, 10), thresholds: T(720, 480, 300, 0.35),
      gini: "0.540", ks: "0.410", psi: "0.060", owner: "Risk Analytics",
      notes: "Built on the SME development sample; turnover-linked affordability applied downstream.",
      deployedAt: ago(80), createdBy: "Grace Zulu" },
    { name: "Mobile Money Micro", version: "v1.3", segment: "micro", status: "monitoring",
      weights: W(20, 25, 15, 35, 5), thresholds: T(680, 460, 280, 0.25),
      gini: "0.490", ks: "0.370", psi: "0.110", owner: "Risk Analytics",
      notes: "PSI above the 0.10 tolerance — population drift under review before the next cycle.",
      deployedAt: ago(59), createdBy: "Grace Zulu" },
    { name: "Thin File Starter", version: "v1.0", segment: "thin_file", status: "draft",
      weights: W(15, 35, 10, 35, 5), thresholds: T(700, 520, 340, 0.2),
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
