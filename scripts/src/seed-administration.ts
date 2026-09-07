import {
  db, platformSettingsTable, featureFlagsTable, complianceFrameworksTable,
  complianceFindingsTable, incidentsTable, auditLogsTable, usersTable,
} from "@workspace/db";
import { sql, eq } from "drizzle-orm";

let s = 31;
const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000 - Math.floor(rand() * 40_000_000));
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);

async function run() {
  console.log("Seeding administration data...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from platform_settings`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  await db.insert(platformSettingsTable).values([
    { key: "maintenance", groupName: "General", label: "Maintenance mode", description: "Suspend tenant access while performing platform maintenance", enabled: false },
    { key: "self-service", groupName: "General", label: "Tenant self-service onboarding", description: "Allow institutions to start onboarding without an invite", enabled: false },
    { key: "sandbox", groupName: "General", label: "Sandbox environment", description: "Expose the sandbox API environment to all tenants", enabled: true },
    { key: "mfa", groupName: "Security", label: "Enforce MFA for all users", description: "Require TOTP or hardware key on every account", enabled: true },
    { key: "sso", groupName: "Security", label: "Tenant SSO (SAML / OIDC)", description: "Allow tenants to federate identity from their own IdP", enabled: true },
    { key: "ip-allow", groupName: "Security", label: "API IP allowlisting", description: "Restrict production API keys to registered IP ranges", enabled: true },
    { key: "session", groupName: "Security", label: "Strict session timeout (15 min)", description: "Idle sessions are terminated after 15 minutes", enabled: false },
    { key: "retention", groupName: "Data Retention", label: "7-year record retention", description: "Retain tradeline history per BoZ CRB directive §14", enabled: true },
    { key: "purge", groupName: "Data Retention", label: "Auto-purge expired consent artefacts", description: "Delete consent evidence 12 months after expiry", enabled: true },
    { key: "anonymise", groupName: "Data Retention", label: "Anonymise closed files after retention", description: "Replace identifiers with irreversible tokens post-retention", enabled: false },
    { key: "sms-consumer", groupName: "Notifications", label: "SMS consumers on hard inquiry", description: "Notify consumers whenever a hard inquiry is made on their file", enabled: true },
    { key: "email-alerts", groupName: "Notifications", label: "Email critical alerts to admins", description: "Send critical platform alerts to the super-admin group", enabled: true },
    { key: "digest", groupName: "Notifications", label: "Weekly operations digest", description: "Summary of submissions, disputes and revenue every Monday", enabled: true },
  ]);
  console.log("  ✓ 13 settings");

  await db.insert(featureFlagsTable).values([
    { key: "open-banking-feed", name: "Open Banking data feed", stage: "beta", rollout: 25, envs: ["sandbox"], owner: "Data Platform", enabled: true },
    { key: "sme-scorecard-v2", name: "SME Scorecard v2.1", stage: "beta", rollout: 50, envs: ["sandbox", "production"], owner: "Risk Analytics", enabled: true },
    { key: "consumer-portal-v2", name: "Consumer self-service portal v2", stage: "ga", rollout: 100, envs: ["production"], owner: "Consumer Experience", enabled: true },
    { key: "realtime-webhooks", name: "Real-time webhook streaming", stage: "ga", rollout: 100, envs: ["production"], owner: "API Platform", enabled: true },
    { key: "ai-dispute-triage", name: "AI-assisted dispute triage", stage: "experimental", rollout: 5, envs: ["sandbox"], owner: "Operations", enabled: true },
    { key: "alt-data-scoring", name: "Alternative data scoring (utility + rent)", stage: "experimental", rollout: 0, envs: [], owner: "Risk Analytics", enabled: false },
    { key: "legacy-batch-ui", name: "Legacy batch upload UI", stage: "deprecated", rollout: 100, envs: ["production"], owner: "Data Platform", enabled: true },
  ]);
  console.log("  ✓ 7 feature flags");

  await db.insert(complianceFrameworksTable).values([
    { name: "BoZ Credit Reporting Directives", scope: "Licensing, data handling, dispute SLAs", progress: 98, status: "compliant", reviewNote: "Last supervisory review Jun 2026" },
    { name: "Data Protection Act (Zambia, 2021)", scope: "Consent, subject access, cross-border transfer", progress: 94, status: "compliant", reviewNote: "DPIA refresh Jul 2026" },
    { name: "PCI-DSS v4.0 (SAQ-D)", scope: "Billing card data environment", progress: 100, status: "compliant", reviewNote: "AoC issued Mar 2026" },
    { name: "ISO/IEC 27001:2022", scope: "Information security management system", progress: 87, status: "in_progress", reviewNote: "Surveillance audit Nov 2026" },
    { name: "SOC 2 Type II", scope: "Trust services criteria for tenant assurance", progress: 62, status: "in_progress", reviewNote: "Target report Q1 2027" },
  ]);

  await db.insert(complianceFindingsTable).values([
    { code: "FND-118", finding: "Consent evidence retention exceeds purge schedule in archive tier", framework: "Data Protection Act", severity: "medium", owner: "Data Platform", status: "open", dueAt: inDays(26), createdAt: daysAgo(12) },
    { code: "FND-117", finding: "Two vendors missing current data processing agreements", framework: "Data Protection Act", severity: "medium", owner: "Legal", status: "in_remediation", dueAt: inDays(11), createdAt: daysAgo(20) },
    { code: "FND-114", finding: "Access reviews for privileged accounts overdue (Q2)", framework: "ISO 27001", severity: "high", owner: "Security", status: "in_remediation", dueAt: inDays(6), createdAt: daysAgo(30) },
    { code: "FND-109", finding: "DR failover test evidence incomplete", framework: "ISO 27001", severity: "low", owner: "Infrastructure", status: "open", dueAt: inDays(57), createdAt: daysAgo(41) },
    { code: "FND-101", finding: "Dispute SLA breaches not auto-reported to BoZ portal", framework: "BoZ Directives", severity: "high", owner: "Operations", status: "closed", dueAt: daysAgo(23), closedAt: daysAgo(23), createdAt: daysAgo(60) },
  ]);
  console.log("  ✓ 5 frameworks, 5 findings");

  await db.insert(incidentsTable).values([
    { code: "INC-2044", title: "Identity Matching latency degradation", impact: "minor", status: "monitoring", startedAt: daysAgo(0.3) },
    { code: "INC-2041", title: "SMS gateway delivery delays (provider outage)", impact: "minor", status: "resolved", startedAt: daysAgo(6), resolvedAt: daysAgo(5.85) },
    { code: "INC-2038", title: "Elevated 5xx on /v1/data/submit during MoMo batch", impact: "major", status: "resolved", startedAt: daysAgo(14), resolvedAt: daysAgo(13.95) },
    { code: "INC-2031", title: "Planned maintenance — database failover drill", impact: "maintenance", status: "resolved", startedAt: daysAgo(25), resolvedAt: daysAgo(24.97) },
  ]);
  console.log("  ✓ 4 incidents");

  const admins = await db.select().from(usersTable).where(eq(usersTable.role, "super_admin"));
  const ACTIONS = [
    "admin_institutions_updated", "admin_users_invite_created", "admin_roles_updated",
    "admin_data_contributions_revalidate_created", "admin_alerts_status_updated",
    "admin_disputes_status_updated", "admin_api_keys_created", "admin_integrations_sync_created",
    "admin_settings_updated", "admin_feature_flags_updated", "tenant_created", "report_generated",
  ];
  const logs = [];
  for (let i = 0; i < 60; i++) {
    logs.push({
      action: pick(ACTIONS),
      userId: pick(admins).id,
      ipAddress: `196.216.${between(60, 90)}.${between(2, 250)}`,
      details: { seeded: true },
      createdAt: daysAgo(between(0, 30)),
    });
  }
  await db.insert(auditLogsTable).values(logs);
  console.log("  ✓ 60 audit log entries");
  console.log("Done.");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
