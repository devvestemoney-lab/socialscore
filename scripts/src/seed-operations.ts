import {
  db, disputesTable, consentsTable, apiKeysTable, integrationsTable,
  customersTable, tenantsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";

let s = 99;
const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000 - Math.floor(rand() * 43_200_000));
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);

const INSTITUTIONS = ["Zanaco Bank", "Stanbic Bank Zambia", "FNB Zambia", "Absa Bank Zambia", "Bayport Financial Services", "FINCA Zambia", "Madison Finance", "MTN Mobile Money", "Airtel Money Zambia"];
const DISPUTE_TYPES = ["Not my account", "Incorrect balance", "Paid but showing arrears", "Account closed, still reporting", "Identity mix-up", "Duplicate tradeline", "Wrong repayment history"];
const DATA_TYPES = ["bank_data", "mobile_money", "mfi_loans", "credit_history", "personal_info"] as const;

async function run() {
  console.log("Seeding operations data...");
  const [{ n: existing }] = (await db.execute(sql`select count(*)::int as n from disputes`)).rows as any[];
  if (existing > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  const customers = await db.select().from(customersTable);
  const tenants = await db.select().from(tenantsTable);

  // ── Disputes ──
  const disputeRows: any[] = [];
  let caseNo = 901;
  for (let i = 0; i < 30; i++) {
    const opened = daysAgo(between(0, 60));
    const r = rand();
    const status = r < 0.2 ? "open" : r < 0.42 ? "under_investigation" : r < 0.52 ? "awaiting_institution" : r < 0.58 ? "escalated" : r < 0.85 ? "resolved_upheld" : r < 0.97 ? "resolved_rejected" : "dismissed";
    const resolved = status.startsWith("resolved_") || status === "dismissed";
    disputeRows.push({
      caseNo: `DSP-2026-${String(caseNo++).padStart(4, "0")}`,
      customerId: pick(customers).id,
      institutionName: pick(INSTITUTIONS),
      type: pick(DISPUTE_TYPES),
      description: "Consumer disputes the accuracy of this record and has provided supporting evidence.",
      status,
      resolution: resolved ? (status === "resolved_upheld" ? "Record corrected — institution confirmed reporting error and resubmitted the tradeline." : "Records verified as accurate — supporting evidence did not substantiate the claim.") : null,
      openedAt: opened,
      dueAt: new Date(opened.getTime() + 21 * 86_400_000),
      resolvedAt: resolved ? new Date(opened.getTime() + between(4, 19) * 86_400_000) : null,
    });
  }
  await db.insert(disputesTable).values(disputeRows);
  console.log(`  ✓ ${disputeRows.length} disputes`);

  // ── Consents (bulk) ──
  const consentRows: any[] = [];
  for (const c of customers) {
    const grants = c.consentGiven ? between(1, 3) : rand() < 0.3 ? 1 : 0;
    for (let i = 0; i < grants; i++) {
      const granted = daysAgo(between(0, 160));
      const revoked = rand() < 0.07;
      consentRows.push({
        customerId: c.id,
        tenantId: rand() < 0.8 ? pick(tenants).id : null,
        dataType: pick([...DATA_TYPES]),
        status: revoked ? "revoked" : "active",
        grantedAt: granted,
        expiresAt: new Date(granted.getTime() + between(90, 365) * 86_400_000),
        revokedAt: revoked ? daysAgo(between(0, 25)) : null,
      });
    }
  }
  await db.insert(consentsTable).values(consentRows);
  console.log(`  ✓ ${consentRows.length} consents`);

  // ── API keys ──
  const mkToken = (env: string) => `sscore_${env === "production" ? "live" : "test"}_${crypto.randomBytes(24).toString("hex")}`;
  const keyRows: any[] = [];
  for (const t of tenants) {
    const prod = mkToken("production");
    keyRows.push({
      tenantId: t.id, token: prod, displayPrefix: prod.slice(0, 16) + "…", env: "production",
      rateLimitRpm: t.type === "mno" ? 1200 : t.type === "bank" ? 600 : 300,
      status: t.status === "suspended" ? "suspended" : "active",
      lastUsedAt: daysAgo(between(0, 3)),
      expiresAt: inDays(between(30, 500)),
      createdAt: daysAgo(between(100, 400)),
    });
    if (rand() < 0.6) {
      const test = mkToken("sandbox");
      keyRows.push({
        tenantId: t.id, token: test, displayPrefix: test.slice(0, 16) + "…", env: "sandbox",
        rateLimitRpm: 60, status: "active", lastUsedAt: daysAgo(between(0, 20)),
        expiresAt: inDays(between(60, 200)), createdAt: daysAgo(between(30, 200)),
      });
    }
  }
  // one expiring-soon key for urgency
  if (keyRows[0]) keyRows[0].expiresAt = inDays(13);
  await db.insert(apiKeysTable).values(keyRows);
  console.log(`  ✓ ${keyRows.length} API keys`);

  // ── Integrations ──
  await db.insert(integrationsTable).values([
    { key: "core-banking", name: "Core Banking Connect", category: "data", description: "Direct feed from Flexcube / T24 core systems for daily tradeline updates", enabled: true, health: "connected", lastSyncAt: daysAgo(0.01) },
    { key: "mno-feed", name: "MNO Data Feed", category: "data", description: "MTN & Airtel mobile money transaction and micro-loan performance data", enabled: true, health: "connected", lastSyncAt: daysAgo(0.03) },
    { key: "nrc-registry", name: "National ID Registry (INRIS)", category: "identity", description: "NRC verification against the Dept. of National Registration", enabled: true, health: "connected", lastSyncAt: daysAgo(0.09) },
    { key: "payments", name: "ZIPSS/RTGS Payments Gateway", category: "payments", description: "Settlement confirmations used to update repayment status", enabled: true, health: "degraded", lastSyncAt: daysAgo(0.05) },
    { key: "sms", name: "SMS Notification Gateway", category: "notifications", description: "Consumer notifications for inquiries, consent and dispute updates", enabled: true, health: "connected", lastSyncAt: daysAgo(0.005) },
    { key: "webhooks", name: "Tenant Webhook Delivery", category: "notifications", description: "Event delivery to tenant systems (reports ready, alerts, disputes)", enabled: true, health: "connected", lastSyncAt: daysAgo(0.003) },
    { key: "sftp", name: "Batch SFTP Exchange", category: "data", description: "Legacy monthly batch submissions for institutions without API access", enabled: true, health: "connected", lastSyncAt: daysAgo(1) },
    { key: "sanctions", name: "Sanctions & PEP Screening", category: "compliance", description: "Optional watchlist screening enrichment on generated reports", enabled: false, health: "not_configured", lastSyncAt: null },
  ]);
  console.log("  ✓ 8 integrations");
  console.log("Done.");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
