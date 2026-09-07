import { db, dataUploadsTable, validationErrorsTable, institutionsTable, tenantsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function run() {
  console.log("Seeding upload history...");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from data_uploads`)).rows as any[];
  if (n > 0) { console.log("Already seeded. Skipping."); process.exit(0); }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.code, "ZANACO"));
  const [institution] = await db.select().from(institutionsTable).where(eq(institutionsTable.name, "Zanaco Bank"));
  if (!institution) { console.log("Zanaco institution not found."); process.exit(0); }

  let no = 3301;
  const mk = (period: string, submitted: number, rejected: number, status: string, days: number, format = "crb_xml_v3", name?: string) => ({
    uploadNo: `UPL-${no++}`,
    institutionId: institution.id, tenantId: tenant?.id ?? null,
    fileName: name ?? `zanaco_${period.replace("-", "")}_full.xml`,
    sizeBytes: submitted * 420, format: format as any, period,
    recordsSubmitted: submitted,
    recordsAccepted: status === "rejected" ? 0 : submitted - rejected,
    recordsRejected: status === "rejected" ? 0 : rejected,
    progress: status === "rejected" ? 32 : 100,
    status: status as any, uploadedBy: "Peter Lungu",
    createdAt: daysAgo(days), completedAt: daysAgo(days),
  });

  const uploads = await db.insert(dataUploadsTable).values([
    mk("2026-06", 401877, 3676, "accepted_with_errors", 68),
    mk("2026-06", 3676, 40, "accepted", 60, "corrections", "zanaco_202606_corrections.csv"),
    mk("2026-07", 408112, 222, "accepted", 37),
    mk("2026-08", 412330, 2349, "accepted_with_errors", 7),
    mk("2026-08", 0, 0, "rejected", 8, "crb_xml_v3", "zanaco_202608_full_v1.xml"),
  ]).returning();
  console.log(`  ✓ ${uploads.length} uploads`);

  const latest = uploads.find(u => u.period === "2026-08" && u.recordsRejected > 0)!;
  await db.insert(validationErrorsTable).values([
    { uploadId: latest.id, code: "E-104", rule: "NRC missing or malformed", affectedRecords: 1204, severity: "blocking",
      sampleLocation: "rows 1,022–2,226", suggestedFix: "Populate consumer NRC from KYC records before extract" },
    { uploadId: latest.id, code: "E-211", rule: "Negative balance on an active facility", affectedRecords: 486, severity: "blocking",
      sampleLocation: "rows 88,410+", suggestedFix: "Check reversal postings before generating the extract" },
    { uploadId: latest.id, code: "E-307", rule: "Disbursement date after the reporting period", affectedRecords: 342, severity: "blocking",
      sampleLocation: "various", suggestedFix: "Exclude facilities opened after month end" },
    { uploadId: latest.id, code: "E-118", rule: "Unknown branch code", affectedRecords: 217, severity: "warning",
      sampleLocation: "BR-091, BR-112", suggestedFix: "Register new branches under Administration → Branches" },
    { uploadId: latest.id, code: "E-402", rule: "Duplicate account reference in batch", affectedRecords: 100, severity: "blocking",
      sampleLocation: "ACC-3312xx", suggestedFix: "De-duplicate on account plus product code" },
  ]);
  console.log("  ✓ 5 validation errors");
  console.log("Done.");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
