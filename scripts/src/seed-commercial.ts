import {
  db, pricingPlansTable, planAddonsTable, subscriptionsTable, invoicesTable, tenantsTable,
} from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function run() {
  console.log("Seeding commercial data...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from pricing_plans`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  const plans = await db.insert(pricingPlansTable).values([
    { code: "STARTER", name: "Starter", tier: 1, monthlyPrice: "7500", includedReports: 2500, includedApiCalls: 10000,
      includedSeats: 2, overageRatePerReport: "45",
      features: ["2,500 credit reports / month", "Score-only API access", "2 user seats", "Email support (48h SLA)", "Monthly batch submission"] },
    { code: "GROWTH", name: "Growth", tier: 2, monthlyPrice: "24000", includedReports: 10000, includedApiCalls: 50000,
      includedSeats: 15, overageRatePerReport: "38",
      features: ["10,000 credit reports / month", "Full report + score APIs", "15 user seats", "Priority support (8h SLA)", "Daily API submission", "Webhook events"] },
    { code: "ENTERPRISE", name: "Enterprise", tier: 3, monthlyPrice: "68000", includedReports: 25000, includedApiCalls: 250000,
      includedSeats: 0, overageRatePerReport: "35",
      features: ["25,000 credit reports / month", "All APIs + portfolio monitoring", "Unlimited seats", "Dedicated account manager", "Real-time streaming", "Custom scorecards", "99.9% uptime SLA"] },
  ]).returning();
  console.log(`  ✓ ${plans.length} pricing plans`);

  await db.insert(planAddonsTable).values([
    { code: "SANCTIONS", name: "Sanctions & PEP screening", description: "Watchlist enrichment on generated reports", price: "12", unit: "per_report" },
    { code: "SANDBOX", name: "Dedicated sandbox", description: "Isolated sandbox environment for UAT", price: "3000", unit: "per_month" },
    { code: "PORTFOLIO", name: "Portfolio monitoring module", description: "Book-level monitoring and early warnings", price: "9500", unit: "per_month" },
    { code: "SUPPORT", name: "Premium support", description: "2h response SLA with named engineer", price: "6000", unit: "per_month" },
  ]);
  console.log("  ✓ 4 add-ons");

  const tenants = await db.select().from(tenantsTable);
  const planFor = (type: string) =>
    type === "bank" ? plans[2] : type === "mno" ? plans[2] : type === "mfi" ? plans[1] : plans[0];

  const subs = await db.insert(subscriptionsTable).values(tenants.map((t, i) => ({
    tenantId: t.id, planId: planFor(t.type).id,
    status: t.status === "suspended" ? ("past_due" as const) : ("active" as const),
    addons: i % 3 === 0 ? ["SANDBOX"] : i % 3 === 1 ? ["SANCTIONS", "PORTFOLIO"] : [],
    discountPct: i === 0 ? "10" : "0",
    startedAt: daysAgo(400 - i * 30), renewsAt: inDays(30 - i),
    contractEndsAt: inDays(365 - i * 20),
  }))).returning();
  console.log(`  ✓ ${subs.length} subscriptions`);

  // Historical invoices for the last 6 closed periods
  const rows: any[] = [];
  let seq = 0;
  for (let back = 6; back >= 1; back--) {
    const d = new Date(); d.setMonth(d.getMonth() - back);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    for (const s of subs) {
      const plan = plans.find(p => p.id === s.planId)!;
      const base = Number(plan.monthlyPrice);
      // usage-driven overage on roughly a third of periods
      const overageUnits = (back + subs.indexOf(s)) % 3 === 0 ? Math.floor(Math.random() * 900) + 100 : 0;
      const overage = overageUnits * Number(plan.overageRatePerReport);
      const addons = s.addons.includes("SANDBOX") ? 3000 : s.addons.includes("PORTFOLIO") ? 9500 : 0;
      const gross = base + overage + addons;
      const discount = gross * (Number(s.discountPct) / 100);
      const total = gross - discount;
      const issued = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      rows.push({
        reference: `INV-${period.replace("-", "")}-${String(++seq).padStart(3, "0")}`,
        tenantId: s.tenantId, period,
        subscriptionAmount: String(base), overageAmount: String(overage),
        addonsAmount: String(addons), discountAmount: String(discount.toFixed(2)),
        total: String(total.toFixed(2)),
        status: back === 1 && subs.indexOf(s) % 4 === 0 ? "overdue" : back === 1 ? "issued" : "paid",
        lineItems: [
          { label: `${plan.name} subscription`, qty: 1, rate: base, amount: base },
          ...(overageUnits ? [{ label: `Report overage (${overageUnits})`, qty: overageUnits, rate: Number(plan.overageRatePerReport), amount: overage }] : []),
          ...(addons ? [{ label: "Add-ons", qty: s.addons.length, rate: 0, amount: addons }] : []),
        ],
        issuedAt: issued, dueAt: new Date(issued.getTime() + 14 * 86_400_000),
        paidAt: back === 1 ? null : new Date(issued.getTime() + 9 * 86_400_000),
      });
    }
  }
  await db.insert(invoicesTable).values(rows);
  console.log(`  ✓ ${rows.length} invoices across 6 periods`);
  console.log("Done.");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
