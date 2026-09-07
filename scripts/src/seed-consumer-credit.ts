import {
  db, customersTable, creditScoresTable, loansTable,
  creditInquiriesTable, creditReportsTable, tenantsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const FIRST = ["Chanda", "Mwansa", "Bwalya", "Thandiwe", "Chisomo", "Lombe", "Namakau", "Kunda", "Chipo", "Joseph", "Grace", "Kelvin", "Ruth", "Peter", "Beatrice", "Mutale", "Musonda", "Mulenga", "Natasha", "Mirriam", "Gift", "Blessing", "Precious", "Emmanuel", "Webster", "Charity", "Memory", "Bright", "Cephas", "Dorcas"];
const LAST = ["Banda", "Phiri", "Mulenga", "Tembo", "Zulu", "Sakala", "Daka", "Lungu", "Mwale", "Chileshe", "Kapembwa", "Ngoma", "Mutale", "Sitali", "Musonda", "Hamainde", "Sichone", "Mwila", "Bwalya", "Chanda", "Kabwe", "Mumba", "Simukonda", "Nyirenda", "Mbewe"];
const PROVINCES = ["Lusaka", "Copperbelt", "Eastern", "Southern", "Northern", "Central", "Western", "Luapula", "Muchinga", "North-Western"];
const INSTITUTIONS: [string, "bank" | "mfi" | "mno"][] = [
  ["Zanaco Bank", "bank"], ["Stanbic Bank Zambia", "bank"], ["FNB Zambia", "bank"], ["Absa Bank Zambia", "bank"],
  ["Bayport Financial Services", "mfi"], ["FINCA Zambia", "mfi"], ["Madison Finance", "mfi"],
  ["MTN Mobile Money", "mno"], ["Airtel Money Zambia", "mno"],
];
const PURPOSES_HARD = ["Personal Loan", "SME Loan", "Salary-backed Loan", "Asset Finance", "Credit Limit Increase", "Mortgage Application"];
const PURPOSES_SOFT = ["Annual Credit Review", "Pre-qualification", "Account Opening", "Airtime Advance", "Portfolio Review"];

let seedState = 42;
const rand = () => { seedState = (seedState * 1103515245 + 12345) & 0x7fffffff; return seedState / 0x7fffffff; };
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000 - Math.floor(rand() * 86_400_000));

const ratingFor = (s: number) => (s >= 720 ? "Excellent" : s >= 660 ? "Good" : s >= 580 ? "Fair" : s >= 480 ? "Poor" : "Very Poor") as "Excellent";
const bandFor = (s: number) => (s >= 720 ? "A" : s >= 660 ? "B" : s >= 580 ? "C" : s >= 480 ? "D" : "E");

/** Weighted score: C-heavy distribution like a real emerging-market book */
function drawScore() {
  const r = rand();
  if (r < 0.18) return between(720, 850);
  if (r < 0.45) return between(660, 719);
  if (r < 0.76) return between(580, 659);
  if (r < 0.92) return between(480, 579);
  return between(320, 479);
}

async function run() {
  console.log("Seeding consumer & credit data...");
  const [{ count: customerCount }] = (await db.execute(sql`select count(*)::int as count from customers`)).rows as any[];
  if (customerCount > 20) { console.log("Consumers already seeded. Skipping."); process.exit(0); }

  const tenants = await db.select().from(tenantsTable);
  const tenantByName = new Map(tenants.map(t => [t.name, t.id]));

  // ── Consumers ──
  const usedNrc = new Set<string>();
  const consumerRows = [];
  for (let i = 0; i < 120; i++) {
    let nrc = "";
    do { nrc = `${between(100000, 999999)}/${between(10, 88)}/1`; } while (usedNrc.has(nrc));
    usedNrc.add(nrc);
    consumerRows.push({
      nrc,
      phone: `+2609${between(50, 79)}${between(100000, 999999)}`,
      firstName: pick(FIRST),
      lastName: pick(LAST),
      dateOfBirth: `${between(1958, 2004)}-${String(between(1, 12)).padStart(2, "0")}-${String(between(1, 28)).padStart(2, "0")}`,
      province: pick(PROVINCES),
      consentGiven: rand() < 0.85,
      identityVerified: rand() < 0.92,
      createdAt: daysAgo(between(30, 900)),
      updatedAt: daysAgo(between(0, 30)),
    });
  }
  const consumers = await db.insert(customersTable).values(consumerRows).returning();
  console.log(`  ✓ ${consumers.length} consumers`);

  // mark the 5 original seed customers verified too
  await db.execute(sql`update customers set identity_verified = true where identity_verified = false and created_at < now() - interval '1 day'`);

  // ── Loans + scores ──
  const loanRows: any[] = [];
  const scoreRows: any[] = [];
  const scoreByCustomer = new Map<string, number>();
  for (const c of consumers) {
    const loanCount = rand() < 0.16 ? between(0, 2) : between(1, 6);
    for (let i = 0; i < loanCount; i++) {
      const [institution, institutionType] = pick(INSTITUTIONS);
      const amount = institutionType === "mno" ? between(50, 3000) : institutionType === "mfi" ? between(2000, 60000) : between(10000, 400000);
      const status = rand() < 0.62 ? "active" : rand() < 0.85 ? "closed" : rand() < 0.94 ? "defaulted" : "written_off";
      loanRows.push({
        customerId: c.id, institution, institutionType,
        amount: String(amount),
        outstandingBalance: String(status === "active" ? Math.round(amount * rand() * 0.9) : status === "closed" ? 0 : amount),
        status, interestRate: String(between(12, 42)),
        missedPayments: status === "defaulted" || status === "written_off" ? between(3, 9) : rand() < 0.25 ? between(1, 2) : 0,
        disbursedAt: daysAgo(between(20, 800)),
        dueDate: new Date(Date.now() + between(30, 700) * 86_400_000),
      });
    }
    if (loanCount > 0 && rand() < 0.94) {
      const score = drawScore();
      scoreByCustomer.set(c.id, score);
      scoreRows.push({
        customerId: c.id,
        score: String(score),
        rating: ratingFor(score),
        probabilityOfDefault: String(Math.min(0.95, Math.max(0.005, (850 - score) / 850))),
        scoreBreakdown: { repaymentHistory: between(40, 100), loanDefaults: between(40, 100), transactionPatterns: between(40, 100), mobileMoney: between(40, 100), accountAge: between(40, 100) },
        recommendation: score >= 660 ? "Approve within standard limits" : score >= 580 ? "Approve with conditions" : "Manual review recommended",
        createdAt: daysAgo(between(0, 60)),
      });
    }
  }
  await db.insert(loansTable).values(loanRows);
  await db.insert(creditScoresTable).values(scoreRows);
  console.log(`  ✓ ${loanRows.length} loans, ${scoreRows.length} scores`);

  // ── Inquiries + reports ──
  const inquiryRows: any[] = [];
  for (let i = 0; i < 460; i++) {
    const c = pick(consumers);
    const [institution] = pick(INSTITUTIONS);
    const kind = rand() < 0.62 ? "hard" : "soft";
    const purpose = kind === "hard" ? `${pick(PURPOSES_HARD)} K${(between(5, 300) * 1000).toLocaleString()}` : pick(PURPOSES_SOFT);
    const outcome = !c.consentGiven && kind === "hard" && rand() < 0.6 ? "declined_no_consent" : rand() < 0.015 ? "declined_policy" : "report_issued";
    inquiryRows.push({
      customerId: c.id, tenantId: tenantByName.get(institution) ?? null, institutionName: institution,
      kind, purpose, outcome, createdAt: daysAgo(between(0, 45)),
    });
  }
  const inquiries = await db.insert(creditInquiriesTable).values(inquiryRows).returning();

  const reportRows: any[] = [];
  let refSeq = 4200;
  for (const inq of inquiries) {
    if (inq.outcome !== "report_issued" || rand() < 0.12) continue;
    const created = new Date(inq.createdAt.getTime() + between(1, 30) * 1000);
    const status = rand() < 0.966 ? "delivered" : rand() < 0.6 ? "partial" : "failed";
    const score = scoreByCustomer.get(inq.customerId) ?? null;
    const d = created.toISOString().slice(2, 10).replace(/-/g, "");
    reportRows.push({
      reference: `RPT-${d}-${refSeq++}`,
      customerId: inq.customerId, tenantId: inq.tenantId, institutionName: inq.institutionName,
      inquiryId: inq.id, purpose: inq.purpose,
      score: status === "failed" ? null : score,
      band: status === "failed" || score === null ? null : bandFor(score),
      status, generationMs: status === "failed" ? between(4000, 12000) : between(600, 3900),
      createdAt: created,
    });
  }
  await db.insert(creditReportsTable).values(reportRows);
  console.log(`  ✓ ${inquiries.length} inquiries, ${reportRows.length} reports`);
  console.log("Done.");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
