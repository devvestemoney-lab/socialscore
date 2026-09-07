import { db, watchlistsTable, watchlistMembersTable, tenantsTable, customersTable, loansTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function run() {
  console.log("Seeding watchlists...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from watchlists`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.code, "ZANACO"));
  if (!tenant) { console.log("Zanaco tenant not found."); process.exit(0); }

  const lists = await db.insert(watchlistsTable).values([
    {
      tenantId: tenant.id, name: "High Risk Borrowers", category: "risk", priority: "critical",
      description: "Score below 550 or 60+ days past due — reviewed weekly by the credit committee",
      owner: "Chanda Mulenga", reviewCadence: "weekly", autoEnrol: true,
      triggers: ["score_drop", "new_arrears", "new_default", "hard_inquiry"],
      channels: ["in_app", "email"], criteria: { maxScore: 560, minMissedPayments: 1 },
      nextReviewAt: inDays(2), createdBy: "Chanda Mulenga",
    },
    {
      tenantId: tenant.id, name: "Recovery Accounts", category: "recovery", priority: "high",
      description: "Written-off facilities in active recovery — watch for signs of renewed capacity",
      owner: "Collections Unit", reviewCadence: "fortnightly", autoEnrol: false,
      triggers: ["new_tradeline", "hard_inquiry", "score_improvement"],
      channels: ["in_app", "email"], criteria: {},
      nextReviewAt: inDays(6), createdBy: "Chanda Mulenga",
    },
    {
      tenantId: tenant.id, name: "VIP Clients", category: "retention", priority: "high",
      description: "Premium relationships — alert on competitor activity so we can pre-empt refinancing",
      owner: "Relationship Management", reviewCadence: "monthly", autoEnrol: true,
      triggers: ["hard_inquiry", "new_tradeline"],
      channels: ["in_app", "email", "sms"], criteria: { minScore: 700, minExposure: 150000 },
      nextReviewAt: inDays(14), createdBy: "Chanda Mulenga",
    },
    {
      tenantId: tenant.id, name: "Restructured Loans", category: "operational", priority: "medium",
      description: "Facilities under revised terms — monitor adherence to the new schedule",
      owner: "Credit Admin", reviewCadence: "monthly", autoEnrol: false,
      triggers: ["new_arrears"], channels: ["in_app"], criteria: {},
      nextReviewAt: inDays(-1), createdBy: "Mwansa Banda",
    },
  ]).returning();
  console.log(`  ✓ ${lists.length} watchlists`);

  // populate from the real Zanaco book
  const risky = (await db.execute(sql`
    select cu.id, coalesce(sum(l.missed_payments), 0)::int as missed,
           (select round(cs.score)::int from credit_scores cs where cs.customer_id = cu.id order by cs.created_at desc limit 1) as score
    from customers cu join loans l on l.customer_id = cu.id and l.institution = ${tenant.name}
    group by cu.id having coalesce(sum(l.missed_payments), 0) > 0 limit 14`)).rows as any[];
  const vip = (await db.execute(sql`
    select cu.id, coalesce(sum(l.outstanding_balance) filter (where l.status != 'closed'), 0)::float as exp
    from customers cu join loans l on l.customer_id = cu.id and l.institution = ${tenant.name}
    group by cu.id order by exp desc limit 9`)).rows as any[];
  const recovery = (await db.execute(sql`
    select distinct cu.id from customers cu join loans l on l.customer_id = cu.id
    where l.institution = ${tenant.name} and l.status in ('written_off','defaulted') limit 7`)).rows as any[];

  const rows: any[] = [];
  risky.forEach((r, i) => rows.push({
    watchlistId: lists[0].id, customerId: r.id, source: "auto",
    reason: `${r.missed} missed payment(s)${r.score ? ` · score ${r.score}` : ''}`,
    addedBy: "System", createdAt: daysAgo(i + 1),
  }));
  recovery.forEach((r, i) => rows.push({
    watchlistId: lists[1].id, customerId: r.id, source: "manual",
    reason: "Written-off facility under active recovery", addedBy: "Collections Unit", createdAt: daysAgo(i + 3),
  }));
  vip.forEach((r, i) => rows.push({
    watchlistId: lists[2].id, customerId: r.id, source: "auto",
    reason: `Exposure K${Math.round(r.exp).toLocaleString()} — premium relationship`,
    addedBy: "System", createdAt: daysAgo(i + 2),
  }));
  const dedup = new Map(rows.map(r => [`${r.watchlistId}:${r.customerId}`, r]));
  await db.insert(watchlistMembersTable).values([...dedup.values()]);
  console.log(`  ✓ ${dedup.size} members enrolled from the live book`);
  console.log("Done.");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
