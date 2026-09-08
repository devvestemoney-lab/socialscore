import {
  db, consumerAlertsTable, reportDownloadsTable, consumerPaymentsTable,
  customersTable, usersTable,
} from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function run() {
  console.log("Seeding consumer portal data...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from consumer_alerts`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  // link any consumer users missing a customer, then seed for the demo consumer
  await db.execute(sql`
    update users u set customer_id = c.id from customers c
    where u.role = 'customer' and u.customer_id is null and c.email = u.email`);

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, "123456/78/1"));
  if (!customer) { console.log("Demo consumer not found."); process.exit(0); }

  await db.insert(consumerAlertsTable).values([
    { customerId: customer.id, kind: "inquiry", severity: "warning",
      title: "Zanaco Bank checked your credit file",
      detail: "A hard search was recorded for a personal loan application. If this was not you, raise a dispute immediately.",
      createdAt: daysAgo(0.2) },
    { customerId: customer.id, kind: "score_change", severity: "info",
      title: "Your credit score changed",
      detail: "Your score moved after your latest scoring run. Open My Credit Score to see which factors moved.",
      createdAt: daysAgo(2) },
    { customerId: customer.id, kind: "new_account", severity: "warning",
      title: "New account reported on your file",
      detail: "A lender reported a new facility in your name. Check My Credit Accounts and dispute it if you do not recognise it.",
      createdAt: daysAgo(9) },
    { customerId: customer.id, kind: "consent_change", severity: "info",
      title: "Consent granted to a lender",
      detail: "You granted a lender permission to access your credit file for an application.",
      readAt: daysAgo(13), createdAt: daysAgo(14) },
    { customerId: customer.id, kind: "missed_payment", severity: "critical",
      title: "A missed payment was reported",
      detail: "A lender reported a payment more than 30 days late. This will affect your score until it is brought up to date.",
      readAt: daysAgo(20), createdAt: daysAgo(22) },
  ]);
  console.log("  ✓ 5 consumer alerts");

  await db.insert(reportDownloadsTable).values([
    { customerId: customer.id, reference: "MYR-880412", format: "pdf", kind: "full_report", scoreAtIssue: 655, createdAt: daysAgo(40) },
  ]);
  await db.insert(consumerPaymentsTable).values([
    { customerId: customer.id, reference: "PAY-880412", description: "Statutory free credit report",
      amount: "0", method: "free_allowance", status: "waived", createdAt: daysAgo(40) },
  ]);
  console.log("  ✓ 1 prior report download and payment record");
  console.log("Done.");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
