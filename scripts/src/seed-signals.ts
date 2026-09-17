import { db, customersTable, consumerSignalsTable, creditScoresTable, loansTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  computeDimensions, blendScore, DEFAULT_WEIGHTS, ratingFor,
} from "../../artifacts/api-server/src/lib/dimensions.js";

const LANDLORDS = ["Lusaka Property Holdings", "Kabulonga Estates", "Ndola Rentals", "Chelston Homes", "Woodlands Lettings"];
const UTILITIES = ["ZESCO", "Lusaka Water & Sewerage", "MTN Zambia", "Airtel Zambia", "DStv Zambia"];
const RETAILERS = ["Game Stores", "Shoprite Lay-By", "Radian Stores", "Melcom Instalments", "Homes & Gardens"];
const EMPLOYERS = ["Zambia Sugar Plc", "Lafarge Zambia", "Ministry of Health", "Zanaco", "Trade Kings", "Self-employed — trading"];
const SCHOOLS = ["Lusaka Trust School", "Chalo Trust School", "Rhodes Park School", "UNZA", "Evelyn Hone College"];

const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length)]!;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthsAgo = (n: number) => new Date(Date.now() - n * 30 * 86_400_000);

/** Deterministic per-customer randomness, so re-running produces the same file. */
function seeded(key: string) {
  let h = 2166136261;
  for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

function statusFor(r: () => number, quality: number) {
  const roll = r();
  if (roll < quality) return "on_time" as const;
  if (roll < quality + (1 - quality) * 0.5) return "late" as const;
  return "missed" as const;
}

async function run() {
  const customers = await db.select().from(customersTable);
  console.log(`Generating behavioural signals for ${customers.length} consumers...`);

  await db.delete(consumerSignalsTable);
  const rows: any[] = [];

  for (const c of customers) {
    const r = seeded(c.nrc);
    // How reliable this person is overall — drives every dimension so a file
    // reads coherently. Skewed so most people are decent payers with a real
    // tail of people who are not, rather than everyone clustering at the top.
    const quality = 0.25 + Math.pow(r(), 0.8) * 0.72;
    const has = (p: number) => r() < p;

    // Housing — rent over the last 12 months, plus tenancy length
    if (has(0.78)) {
      const landlord = pick(LANDLORDS, r);
      for (let m = 1; m <= 12; m++) {
        rows.push({
          customerId: c.id, dimension: "housing", kind: "rent_payment", source: landlord,
          amount: String(1200 + Math.floor(r() * 4000)),
          dueDate: iso(monthsAgo(m)), paidDate: iso(monthsAgo(m)),
          status: statusFor(r, quality),
        });
      }
      rows.push({
        customerId: c.id, dimension: "housing", kind: "residence", source: landlord,
        status: "ongoing", months: 6 + Math.floor(r() * 60),
      });
    }

    // Payments — utility and airtime bills from one to three providers
    const providers = UTILITIES.slice(0, 1 + Math.floor(r() * 3));
    for (const provider of providers) {
      for (let m = 1; m <= 8; m++) {
        rows.push({
          customerId: c.id, dimension: "payments", kind: "utility_bill", source: provider,
          amount: String(60 + Math.floor(r() * 900)),
          dueDate: iso(monthsAgo(m)), paidDate: iso(monthsAgo(m)),
          status: statusFor(r, quality),
        });
      }
    }

    // Airtime borrowing — MTN Xtra Time / Airtel Credit. Small, frequent, and
    // repaid automatically off the next top-up, so it is the densest signal
    // most Zambians have. Reported under payments alongside bills.
    if (has(0.96)) {
      const operator = r() < 0.55 ? "MTN Zambia" : "Airtel Zambia";
      const advances = 4 + Math.floor(r() * 14);
      for (let i = 0; i < advances; i++) {
        const daysBack = Math.floor(r() * 180);
        const due = new Date(Date.now() - daysBack * 86_400_000);
        const st = statusFor(r, Math.min(0.97, quality + 0.08));
        rows.push({
          customerId: c.id, dimension: "payments", kind: "airtime_advance", source: operator,
          amount: String([5, 10, 15, 20, 30, 50][Math.floor(r() * 6)]),
          dueDate: iso(due),
          paidDate: st === "missed" ? null : iso(new Date(due.getTime() + (st === "late" ? 4 : 1) * 86_400_000)),
          status: st,
          metadata: { product: operator === "MTN Zambia" ? "Xtra Time" : "Airtel Credit" },
        });
      }
    }

    // Mobile money loans — MTN Kongola / Airtel Kabet. Larger than airtime, a
    // real short-term loan with a due date.
    if (has(0.62)) {
      const operator = r() < 0.5 ? "MTN Mobile Money" : "Airtel Money";
      const loans = 1 + Math.floor(r() * 4);
      for (let i = 0; i < loans; i++) {
        const monthsBack = 1 + Math.floor(r() * 10);
        const st = statusFor(r, quality);
        rows.push({
          customerId: c.id, dimension: "payments", kind: "mobile_money_loan", source: operator,
          amount: String(100 + Math.floor(r() * 12) * 50),
          dueDate: iso(monthsAgo(monthsBack)),
          paidDate: st === "missed" ? null : iso(monthsAgo(monthsBack)),
          status: st,
          metadata: { product: operator === "MTN Mobile Money" ? "Kongola" : "Kabet" },
        });
      }
    }

    // Commerce — lay-bys and instalment plans
    if (has(0.62)) {
      const plans = 1 + Math.floor(r() * 3);
      for (let i = 0; i < plans; i++) {
        rows.push({
          customerId: c.id, dimension: "commerce",
          kind: r() < 0.5 ? "bnpl_instalment" : "lay_by",
          source: pick(RETAILERS, r),
          amount: String(400 + Math.floor(r() * 6000)),
          dueDate: iso(monthsAgo(1 + Math.floor(r() * 14))),
          paidDate: iso(monthsAgo(1 + Math.floor(r() * 14))),
          status: statusFor(r, quality),
        });
      }
    }

    // Stability — employment and where they live
    if (has(0.85)) {
      rows.push({
        customerId: c.id, dimension: "stability", kind: "employment", source: pick(EMPLOYERS, r),
        status: r() < 0.88 ? "ongoing" : "ended", months: 3 + Math.floor(r() * 84),
      });
    }
    rows.push({
      customerId: c.id, dimension: "stability", kind: "residence", source: c.province,
      status: "ongoing", months: 4 + Math.floor(r() * 72),
    });

    // Education — school fees, where the consumer has that commitment
    if (has(0.48)) {
      const school = pick(SCHOOLS, r);
      for (let term = 1; term <= 4; term++) {
        rows.push({
          customerId: c.id, dimension: "education", kind: "school_fee", source: school,
          amount: String(800 + Math.floor(r() * 5000)),
          dueDate: iso(monthsAgo(term * 3)), paidDate: iso(monthsAgo(term * 3)),
          status: statusFor(r, quality),
        });
      }
    }

    // Reputation — endorsements from institutions that have dealt with them
    if (has(0.4)) {
      const count = 1 + Math.floor(r() * 3);
      for (let i = 0; i < count; i++) {
        rows.push({
          customerId: c.id, dimension: "reputation", kind: "endorsement",
          source: pick([...LANDLORDS, ...EMPLOYERS, ...RETAILERS], r),
          status: "ongoing",
        });
      }
    }
  }

  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(consumerSignalsTable).values(rows.slice(i, i + 500));
  }
  console.log(`  ${rows.length} signals written.`);

  // Rescore everyone from the dimensions now that the evidence exists
  console.log("Rescoring consumers across all seven dimensions...");
  const [allSignals, allLoans] = await Promise.all([
    db.select().from(consumerSignalsTable),
    db.select().from(loansTable),
  ]);
  const signalsBy = new Map<string, any[]>();
  for (const s of allSignals) (signalsBy.get(s.customerId) ?? signalsBy.set(s.customerId, []).get(s.customerId)!).push(s);
  const loansBy = new Map<string, any[]>();
  for (const l of allLoans) (loansBy.get(l.customerId) ?? loansBy.set(l.customerId, []).get(l.customerId)!).push(l);

  const upheld = (await db.execute(sql`
    select customer_id, count(*)::int as n from disputes
    where status = 'resolved' and resolution ilike '%upheld%' group by customer_id`)).rows as any[];
  const upheldBy = new Map(upheld.map(u => [u.customer_id, Number(u.n)]));

  let scored = 0;
  for (const c of customers) {
    const signals = signalsBy.get(c.id) ?? [];
    const loans = loansBy.get(c.id) ?? [];
    const ageMonths = loans.length
      ? Math.round((Date.now() - Math.min(...loans.map(l => new Date(l.disbursedAt ?? l.createdAt).getTime()))) / (30 * 86_400_000))
      : 0;

    const dimensions = computeDimensions({
      signals, loans, accountAgeMonths: ageMonths,
      disputesUpheldAgainst: upheldBy.get(c.id) ?? 0,
    });
    const { score, coverage } = blendScore(dimensions, DEFAULT_WEIGHTS);

    await db.insert(creditScoresTable).values({
      customerId: c.id,
      score: String(score),
      rating: ratingFor(score) as any,
      probabilityOfDefault: String(Math.max(0.01, Math.min(0.99, 1 - (score - 300) / 550)).toFixed(4)),
      dimensions,
      scoreBreakdown: {
        repaymentHistory: dimensions.credit ?? 0,
        loanDefaults: dimensions.credit ?? 0,
        transactionPatterns: dimensions.commerce ?? dimensions.payments ?? 0,
        mobileMoney: dimensions.payments ?? 0,
        accountAge: dimensions.stability ?? 0,
      },
      recommendation: score >= 660
        ? "Approve — strong across the dimensions with evidence behind them."
        : score >= 580
        ? "Consider — mixed record. Conservative limit recommended."
        : "Refer — weak or thin evidence across the scoring dimensions.",
      aiInsights: `Scored on ${coverage}% weight coverage across seven dimensions.`,
    });
    scored++;
  }
  console.log(`  ${scored} consumers rescored.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
