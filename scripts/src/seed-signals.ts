import { db, customersTable, consumerSignalsTable, mnoTransactionsTable } from "@workspace/db";
import { like } from "drizzle-orm";
import { categorise } from "../../artifacts/api-server/src/lib/mno.js";
import { scoreConsumer } from "../../artifacts/api-server/src/lib/score-consumer.js";

/**
 * UAT data for the behavioural score: rent, bills and refuse collection, peer
 * lending, instalments, employment, and six months of mobile money activity
 * per consumer. Replaces all signals and all seeded MNO transactions, so it
 * refuses to run against production.
 */

const LANDLORDS = ["Lusaka Property Holdings", "Kabulonga Estates", "Ndola Rentals", "Chelston Homes", "Woodlands Lettings"];
const UTILITIES = ["ZESCO", "Lusaka Water & Sewerage", "MTN Zambia", "Airtel Zambia"];
const REFUSE = ["Lusaka City Council — Refuse", "Ndola City Council — Refuse", "Kitwe City Council — Refuse", "Clean City Waste Collectors", "Green Bins Zambia"];
const PEER_SOURCES = [
  { name: "Chilimba group — Kalingalinga", kind: "savings_group_loan" },
  { name: "Village banking — Chawama", kind: "savings_group_loan" },
  { name: "Village banking — Kanyama", kind: "savings_group_loan" },
  { name: "Peer lender (individual)", kind: "p2p_loan" },
  { name: "P2P lending platform", kind: "p2p_loan" },
];
const RETAILERS = ["Game Stores", "Shoprite Lay-By", "Radian Stores", "Melcom Instalments", "Homes & Gardens"];
const EMPLOYERS = ["Zambia Sugar Plc", "Lafarge Zambia", "Ministry of Health", "Zanaco", "Trade Kings", "Self-employed — trading"];
const BETTING = ["Betway", "Bolabet", "Gal Sport Betting", "Premier Bet", "BetPawa"];
const MERCHANTS = ["Shoprite", "Pick n Pay", "Choppies", "Puma Filling Station", "Hungry Lion", "Pharmacy"];
const BILLERS = ["ZESCO", "Lusaka Water & Sewerage"];
const DIGITAL_LENDERS = ["Kongola", "Kabet", "LendNow App", "CashFlex App"];

const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length)]!;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAY = 86_400_000;
const monthsAgo = (n: number) => new Date(Date.now() - n * 30 * DAY);

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

/** The network from the number: 096/076 MTN, 097/077 Airtel, 095 Zamtel. */
function providerFor(phone: string): "mtn" | "airtel" | "zamtel" {
  const code = phone.replace(/\D/g, "").slice(-9, -7);
  return code === "96" || code === "76" ? "mtn" : code === "95" ? "zamtel" : "airtel";
}

type Txn = { at: number; direction: "in" | "out"; amount: number; type: string; counterparty: string };

/**
 * Six months of wallet activity shaped by a persona: how income arrives,
 * how much of it is spent, and how much goes to betting — including people
 * whose betting has grown sharply in the last three months.
 */
function wallet(r: () => number, quality: number): Txn[] {
  const salaried = r() < 0.58;
  const monthlyIncome = 2500 + Math.floor(r() * 12000);
  const betRoll = r();
  const betting = betRoll < 0.6 ? "none" : betRoll < 0.8 ? "light" : betRoll < 0.92 ? "heavy" : "rising";
  const stacking = r() < 0.1;
  const txns: Txn[] = [];
  const now = Date.now();

  for (let m = 0; m < 6; m++) {
    const start = now - (m + 1) * 30 * DAY;
    const at = () => start + Math.floor(r() * 30 * DAY);

    // Income
    let income = 0;
    if (salaried) {
      income = Math.round(monthlyIncome * (0.95 + r() * 0.1));
      txns.push({ at: start + 24 * DAY, direction: "in", amount: income, type: "SALARY", counterparty: "Employer payroll" });
    } else {
      const target = monthlyIncome * (0.4 + r() * 1.2);
      while (income < target) {
        const amt = 50 + Math.floor(r() * 900);
        income += amt;
        txns.push({ at: at(), direction: "in", amount: amt, type: r() < 0.6 ? "P2P" : "CASH_IN", counterparty: r() < 0.6 ? "Customer" : "Agent" });
      }
    }

    // Betting share of spending, by persona — rising bettors triple in the last three months
    const share = betting === "none" ? 0
      : betting === "light" ? 0.02 + r() * 0.03
      : betting === "heavy" ? 0.18 + r() * 0.22
      : m < 3 ? 0.28 + r() * 0.12 : 0.03 + r() * 0.04;

    // Spend roughly what comes in; weaker payers overspend
    const spend = income * (0.8 + (1 - quality) * 0.35 + r() * 0.1);
    let bet = spend * share;
    while (bet > 0) {
      const stake = Math.min(bet, 10 + Math.floor(r() * 190));
      bet -= stake;
      const op = pick(BETTING, r);
      const when = at();
      txns.push({ at: when, direction: "out", amount: Math.round(stake), type: "MERCHANT_PAY", counterparty: op });
      if (r() < 0.25) txns.push({ at: when + DAY, direction: "in", amount: Math.round(stake * (1 + r() * 2)), type: "P2P", counterparty: op });
    }
    const rest = spend * (1 - share);
    const parts: [number, string, () => string][] = [
      [0.3, "CASH_OUT", () => "Agent"],
      [0.25, "MERCHANT_PAY", () => pick(MERCHANTS, r)],
      [0.1, "BILL_PAY", () => pick(BILLERS, r)],
      [0.05, "AIRTIME", () => "Airtime"],
      [0.3, "P2P", () => "Family / friends"],
    ];
    for (const [portion, type, who] of parts) {
      let left = rest * portion;
      while (left > 1) {
        const amt = Math.min(left, 20 + Math.floor(r() * 600));
        left -= amt;
        txns.push({ at: at(), direction: "out", amount: Math.round(amt), type, counterparty: who() });
      }
    }

    // Borrowing from several digital lenders in the last three months
    if (stacking && m < 3) {
      for (const lender of DIGITAL_LENDERS.slice(0, 3 + Math.floor(r() * 2))) {
        const when = at();
        const amt = 200 + Math.floor(r() * 8) * 100;
        txns.push({ at: when, direction: "in", amount: amt, type: "LOAN_DISBURSEMENT", counterparty: lender });
        txns.push({ at: when + 14 * DAY, direction: "out", amount: Math.round(amt * 1.15), type: "LOAN_REPAYMENT", counterparty: lender });
      }
    }
  }

  return txns.filter(t => t.at <= now).sort((a, b) => a.at - b.at);
}

async function run() {
  if (process.env.NODE_ENV === "production") {
    console.error("seed-signals replaces behavioural data wholesale — refusing to run with NODE_ENV=production.");
    process.exit(1);
  }

  const customers = await db.select().from(customersTable);
  console.log(`Generating behavioural signals and mobile money for ${customers.length} consumers...`);

  await db.delete(consumerSignalsTable);
  await db.delete(mnoTransactionsTable).where(like(mnoTransactionsTable.reference, "SEED-%"));
  const rows: any[] = [];
  const txnRows: any[] = [];

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

    // Payments — utility bills from one to three providers
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

    // Refuse collection — monthly garbage fees to the council or a private collector
    if (has(0.55)) {
      const collector = pick(REFUSE, r);
      for (let m = 1; m <= 6; m++) {
        rows.push({
          customerId: c.id, dimension: "payments", kind: "refuse_collection", source: collector,
          amount: String(50 + Math.floor(r() * 100)),
          dueDate: iso(monthsAgo(m)), paidDate: iso(monthsAgo(m)),
          status: statusFor(r, quality),
        });
      }
    }

    // Airtime borrowing — MTN Xtra Time / Airtel Credit, repaid off the next top-up
    if (has(0.96)) {
      const operator = r() < 0.55 ? "MTN Zambia" : "Airtel Zambia";
      const advances = 4 + Math.floor(r() * 14);
      for (let i = 0; i < advances; i++) {
        const due = new Date(Date.now() - Math.floor(r() * 180) * DAY);
        const st = statusFor(r, Math.min(0.97, quality + 0.08));
        rows.push({
          customerId: c.id, dimension: "payments", kind: "airtime_advance", source: operator,
          amount: String([5, 10, 15, 20, 30, 50][Math.floor(r() * 6)]),
          dueDate: iso(due),
          paidDate: st === "missed" ? null : iso(new Date(due.getTime() + (st === "late" ? 4 : 1) * DAY)),
          status: st,
          metadata: { product: operator === "MTN Zambia" ? "Xtra Time" : "Airtel Credit" },
        });
      }
    }

    // Mobile money loans — MTN Kongola / Airtel Kabet
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

    // Peer lending — chilimba, village banking and person-to-person loans, repaid in instalments
    if (has(0.4)) {
      const loans = 1 + Math.floor(r() * 3);
      for (let i = 0; i < loans; i++) {
        const lender = pick(PEER_SOURCES, r);
        const principal = 300 + Math.floor(r() * 30) * 100;
        const instalments = 1 + Math.floor(r() * 3);
        const startMonth = 1 + Math.floor(r() * 10);
        for (let k = 0; k < instalments; k++) {
          const due = monthsAgo(Math.max(0, startMonth - k));
          const st = statusFor(r, quality);
          rows.push({
            customerId: c.id, dimension: "peer", kind: lender.kind, source: lender.name,
            amount: String(Math.round((principal * 1.1) / instalments)),
            dueDate: iso(due), paidDate: st === "missed" ? null : iso(due),
            status: st,
            metadata: { principal, instalment: `${k + 1} of ${instalments}` },
          });
        }
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

    // Mobile money — most consumers have a wallet; categorised exactly as live ingest does
    if (has(0.85)) {
      const provider = providerFor(c.phone);
      let balance = 100 + Math.floor(r() * 800);
      wallet(r, quality).forEach((t, i) => {
        balance = Math.max(0, balance + (t.direction === "in" ? t.amount : -t.amount));
        txnRows.push({
          customerId: c.id, provider, reference: `SEED-${c.nrc}-${i}`,
          occurredAt: new Date(t.at), direction: t.direction,
          amount: t.amount.toFixed(2), balanceAfter: balance.toFixed(2),
          mnoType: t.type, counterparty: t.counterparty,
          category: categorise({ mnoType: t.type, direction: t.direction, counterparty: t.counterparty }),
        });
      });
    }
  }

  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(consumerSignalsTable).values(rows.slice(i, i + 500));
  }
  console.log(`  ${rows.length} signals written.`);
  for (let i = 0; i < txnRows.length; i += 1000) {
    await db.insert(mnoTransactionsTable).values(txnRows.slice(i, i + 1000));
  }
  console.log(`  ${txnRows.length} mobile money transactions written.`);

  // Rescore everyone through the same service the API uses
  console.log("Rescoring consumers...");
  let scored = 0, unscorable = 0;
  for (const c of customers) {
    const outcome = await scoreConsumer(c.id);
    if (outcome.scorable) scored++; else unscorable++;
  }
  console.log(`  ${scored} consumers scored, ${unscorable} too thin to score.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
