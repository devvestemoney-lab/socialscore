import { db, branchesTable, tenantsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

async function run() {
  console.log("Seeding branches...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from branches`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.code, "ZANACO"));
  if (!tenant) { console.log("Zanaco not found."); process.exit(0); }

  await db.insert(branchesTable).values([
    { tenantId: tenant.id, code: "BR-001", name: "Head Office — Cairo Road", city: "Lusaka", province: "Lusaka", managerName: "Chanda Mulenga", status: "active" },
    { tenantId: tenant.id, code: "BR-014", name: "Manda Hill", city: "Lusaka", province: "Lusaka", managerName: "Natasha Phiri", status: "active" },
    { tenantId: tenant.id, code: "BR-032", name: "Kitwe — Obote Avenue", city: "Kitwe", province: "Copperbelt", managerName: "Kelvin Sakala", status: "active" },
    { tenantId: tenant.id, code: "BR-045", name: "Ndola — Broadway", city: "Ndola", province: "Copperbelt", managerName: "Beatrice Mwale", status: "active" },
    { tenantId: tenant.id, code: "BR-067", name: "Livingstone — Mosi-oa-Tunya", city: "Livingstone", province: "Southern", managerName: "Joseph Tembo", status: "active" },
    { tenantId: tenant.id, code: "BR-091", name: "Chipata Agency", city: "Chipata", province: "Eastern", managerName: "", status: "pending_setup" },
  ]);
  console.log("  ✓ 6 branches");
  console.log("Done.");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
