import { db, webhooksTable, webhookDeliveriesTable, tenantsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000);

async function run() {
  console.log("Seeding webhooks...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from webhooks`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.code, "ZANACO"));
  if (!tenant) { console.log("Zanaco not found."); process.exit(0); }

  const hooks = await db.insert(webhooksTable).values([
    { tenantId: tenant.id, url: "https://api.zanaco.co.zm/hooks/sscore/reports",
      description: "Credit report lifecycle into the loan origination system",
      events: ["report.ready", "report.failed"], secretPrefix: "whsec_8f3a2c91b7…",
      health: "healthy", lastDeliveryAt: hoursAgo(1) },
    { tenantId: tenant.id, url: "https://api.zanaco.co.zm/hooks/sscore/alerts",
      description: "Consumer and portfolio alerts into the risk dashboard",
      events: ["alert.consumer", "alert.portfolio", "score.updated"], secretPrefix: "whsec_2c91d04ea3…",
      health: "healthy", lastDeliveryAt: hoursAgo(6) },
    { tenantId: tenant.id, url: "https://api.zanaco.co.zm/hooks/sscore/disputes",
      description: "Dispute events routed to the complaints queue",
      events: ["dispute.opened", "dispute.resolved"], secretPrefix: "whsec_b774ff01c8…",
      active: false, health: "paused", lastDeliveryAt: hoursAgo(190) },
  ]).returning();
  console.log(`  ✓ ${hooks.length} webhooks`);

  await db.insert(webhookDeliveriesTable).values([
    { webhookId: hooks[0].id, event: "report.ready", responseCode: 200, attempts: 1, durationMs: 184, createdAt: hoursAgo(1) },
    { webhookId: hooks[0].id, event: "report.ready", responseCode: 200, attempts: 1, durationMs: 210, createdAt: hoursAgo(4) },
    { webhookId: hooks[1].id, event: "alert.consumer", responseCode: 200, attempts: 1, durationMs: 96, createdAt: hoursAgo(6) },
    { webhookId: hooks[0].id, event: "report.failed", responseCode: 500, attempts: 3, durationMs: 3021,
      error: "Endpoint returned 500 after 3 attempts", createdAt: hoursAgo(26) },
    { webhookId: hooks[1].id, event: "alert.portfolio", responseCode: 200, attempts: 1, durationMs: 143, createdAt: hoursAgo(30) },
    { webhookId: hooks[2].id, event: "dispute.opened", responseCode: 200, attempts: 1, durationMs: 265, createdAt: hoursAgo(190) },
  ]);
  console.log("  ✓ 6 deliveries");
  console.log("Done.");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
