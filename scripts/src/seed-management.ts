import { db, institutionsTable, rolesTable, usersTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const hash = (p: string) => bcrypt.hashSync(p, 10);
const days = (n: number) => new Date(Date.now() - n * 86_400_000);

const MODULES = ["Dashboards", "Credit Reports", "Data Submission", "Consumer Registry", "Disputes", "User Management", "Billing", "System Settings"] as const;
const perms = (levels: (0 | 1 | 2)[]) => Object.fromEntries(MODULES.map((m, i) => [m, levels[i]]));

async function seedManagement() {
  console.log("Seeding tenant-management data...");

  // ── Roles ──
  const existingRoles = await db.select().from(rolesTable);
  if (existingRoles.length === 0) {
    await db.insert(rolesTable).values([
      { name: "Super Admin", scope: "platform", isSystem: true, description: "Full platform control incl. tenants, billing and system settings", permissions: perms([2, 2, 2, 2, 2, 2, 2, 2]) },
      { name: "Bureau Operator", scope: "platform", isSystem: true, description: "Manages data ingestion, quality and consumer registry operations", permissions: perms([2, 2, 2, 2, 2, 1, 0, 0]) },
      { name: "Tenant Admin", scope: "tenant", isSystem: true, description: "Manages users, API keys and settings within their institution", permissions: perms([2, 2, 1, 1, 2, 2, 1, 0]) },
      { name: "Credit Analyst", scope: "tenant", isSystem: false, description: "Pulls credit reports and scores for authorised purposes", permissions: perms([2, 2, 0, 1, 1, 0, 0, 0]) },
      { name: "Data Officer", scope: "tenant", isSystem: false, description: "Submits and monitors data contributions for their institution", permissions: perms([1, 0, 2, 1, 0, 0, 0, 0]) },
      { name: "Compliance Officer", scope: "tenant", isSystem: false, description: "Read-only oversight of disputes, consent and audit trails", permissions: perms([1, 1, 1, 1, 1, 1, 1, 0]) },
      { name: "Viewer", scope: "tenant", isSystem: false, description: "Read-only dashboard access, no report generation", permissions: perms([1, 0, 0, 0, 0, 0, 0, 0]) },
    ]);
    console.log("  ✓ roles seeded");
  } else {
    console.log("  roles already present, skipping");
  }

  const roles = await db.select().from(rolesTable);
  const roleId = (name: string) => roles.find(r => r.name === name)?.id ?? null;

  // ── Institutions ──
  const existingInstitutions = await db.select().from(institutionsTable);
  if (existingInstitutions.length === 0) {
    const tenants = await db.select().from(tenantsTable);
    const tenantId = (code: string) => tenants.find(t => t.code === code)?.id ?? null;
    await db.insert(institutionsTable).values([
      { name: "Zanaco Bank", type: "commercial_bank", licenseNo: "BoZ/CB/001", branches: 68, dataFeeds: 3, status: "active", contactEmail: "ops@zanaco.co.zm", tenantId: tenantId("ZANACO"), memberSince: new Date("2021-01-12") },
      { name: "Stanbic Bank Zambia", type: "commercial_bank", licenseNo: "BoZ/CB/004", branches: 27, dataFeeds: 2, status: "active", contactEmail: "credit@stanbic.co.zm", memberSince: new Date("2021-03-04") },
      { name: "FNB Zambia", type: "commercial_bank", licenseNo: "BoZ/CB/007", branches: 22, dataFeeds: 2, status: "active", contactEmail: "bureau@fnbzambia.co.zm", memberSince: new Date("2021-06-18") },
      { name: "Absa Bank Zambia", type: "commercial_bank", licenseNo: "BoZ/CB/002", branches: 34, dataFeeds: 3, status: "active", contactEmail: "data@absa.co.zm", memberSince: new Date("2021-02-09") },
      { name: "Bayport Financial Services", type: "microfinance", licenseNo: "BoZ/MFI/012", branches: 41, dataFeeds: 1, status: "active", contactEmail: "risk@bayport.co.zm", memberSince: new Date("2021-09-22") },
      { name: "FINCA Zambia", type: "microfinance", licenseNo: "BoZ/MFI/018", branches: 14, dataFeeds: 1, status: "active", contactEmail: "credit@finca.co.zm", tenantId: tenantId("FINCA"), memberSince: new Date("2021-11-30") },
      { name: "Madison Finance", type: "microfinance", licenseNo: "BoZ/MFI/009", branches: 11, dataFeeds: 1, status: "suspended", contactEmail: "info@madison.co.zm", memberSince: new Date("2022-04-14") },
      { name: "MTN Mobile Money", type: "mobile_money", licenseNo: "BoZ/PSP/003", branches: 0, dataFeeds: 1, status: "active", contactEmail: "momo@mtn.co.zm", memberSince: new Date("2022-07-08") },
      { name: "Airtel Money Zambia", type: "mobile_money", licenseNo: "BoZ/PSP/005", branches: 0, dataFeeds: 1, status: "active", contactEmail: "am@airtel.co.zm", memberSince: new Date("2022-08-19") },
      { name: "ZESCO Utility Credit", type: "utility", licenseNo: "ERB/U/001", branches: 0, dataFeeds: 1, status: "onboarding", contactEmail: "billing@zesco.co.zm", memberSince: new Date("2025-08-03") },
    ]);
    console.log("  ✓ institutions seeded");
  } else {
    console.log("  institutions already present, skipping");
  }

  // ── Extra users with access metadata ──
  const tenants = await db.select().from(tenantsTable);
  const tid = (code: string) => tenants.find(t => t.code === code)?.id ?? null;
  const extraUsers = [
    { email: "chanda.mulenga@zanaco.co.zm", name: "Chanda Mulenga", role: "tenant_admin" as const, tenantCode: "ZANACO", roleName: "Tenant Admin", status: "active" as const, mfaEnabled: true, lastLoginAt: days(0) },
    { email: "mwansa.banda@zanaco.co.zm", name: "Mwansa Banda", role: "tenant_user" as const, tenantCode: "ZANACO", roleName: "Credit Analyst", status: "active" as const, mfaEnabled: true, lastLoginAt: days(1) },
    { email: "joseph.tembo@finca.co.zm", name: "Joseph Tembo", role: "tenant_user" as const, tenantCode: "FINCA", roleName: "Credit Analyst", status: "active" as const, mfaEnabled: false, lastLoginAt: days(2) },
    { email: "grace.zulu@socialscore.co.zm", name: "Grace Zulu", role: "super_admin" as const, tenantCode: null, roleName: "Bureau Operator", status: "active" as const, mfaEnabled: true, lastLoginAt: days(0) },
    { email: "kelvin.sakala@finca.co.zm", name: "Kelvin Sakala", role: "tenant_user" as const, tenantCode: "FINCA", roleName: "Viewer", status: "invited" as const, mfaEnabled: false, lastLoginAt: null },
    { email: "ruth.daka@zanaco.co.zm", name: "Ruth Daka", role: "tenant_user" as const, tenantCode: "ZANACO", roleName: "Compliance Officer", status: "suspended" as const, mfaEnabled: true, lastLoginAt: days(31) },
    { email: "peter.lungu@zanaco.co.zm", name: "Peter Lungu", role: "tenant_user" as const, tenantCode: "ZANACO", roleName: "Data Officer", status: "active" as const, mfaEnabled: true, lastLoginAt: days(0) },
  ];
  let created = 0;
  for (const u of extraUsers) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, u.email));
    if (existing) continue;
    await db.insert(usersTable).values({
      email: u.email,
      name: u.name,
      role: u.role,
      tenantId: u.tenantCode ? tid(u.tenantCode) : null,
      roleId: roleId(u.roleName),
      status: u.status,
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt,
      isActive: u.status !== "suspended",
      passwordHash: hash("demo1234"),
    });
    created++;
  }
  console.log(`  ✓ ${created} users added`);

  // Link the seed super-admin & tenant admin accounts to their bureau roles
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@zamcredit.zm"));
  if (admin && !admin.roleId) {
    await db.update(usersTable).set({ roleId: roleId("Super Admin"), mfaEnabled: true }).where(eq(usersTable.id, admin.id));
  }

  console.log("Done.");
  process.exit(0);
}

seedManagement().catch(e => { console.error(e); process.exit(1); });
