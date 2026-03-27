import { Loan } from "@workspace/db";

const ZAMBIAN_BANKS = ["Zanaco", "Standard Chartered", "Stanbic Bank", "First National Bank", "Absa", "Atlas Mara"];
const ZAMBIAN_MFIS = ["FINCA Zambia", "Bayport Financial Services", "VisionFund", "BRAC Zambia", "Izwe Loans"];
const ZAMBIAN_MNOS = ["MTN Zambia", "Airtel Money", "Zamtel Kwacha"];

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let s = Math.abs(hash) || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function generateBankData(nrc: string) {
  const rand = seededRandom(`bank-${nrc}`);
  const bankCount = Math.floor(rand() * 3) + 1;
  const accounts = [];
  const transactions = [];

  for (let i = 0; i < bankCount; i++) {
    const bank = ZAMBIAN_BANKS[Math.floor(rand() * ZAMBIAN_BANKS.length)];
    const balance = Math.round(rand() * 50000 + 500);
    accounts.push({
      id: `acc-${nrc}-${i}`,
      accountNumber: `${Math.floor(rand() * 9000000000) + 1000000000}`,
      type: (["savings", "current", "fixed_deposit"] as const)[Math.floor(rand() * 3)],
      balance,
      currency: "ZMW",
      bank,
      openedAt: new Date(Date.now() - rand() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Generate transactions
    const txCount = Math.floor(rand() * 20) + 5;
    const categories = ["salary", "utilities", "groceries", "loan_payment", "transfer", "mobile_top_up"];
    for (let j = 0; j < txCount; j++) {
      transactions.push({
        id: `tx-${nrc}-${i}-${j}`,
        type: (rand() > 0.4 ? "credit" : "debit") as "credit" | "debit",
        amount: Math.round(rand() * 5000 + 100),
        currency: "ZMW",
        description: `Transaction ${j + 1}`,
        date: new Date(Date.now() - rand() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        category: categories[Math.floor(rand() * categories.length)],
      });
    }
  }

  return { nrc, accounts, transactions, source: "Zambia Banking Association (Mock)" };
}

export function generateMnoData(nrc: string) {
  const rand = seededRandom(`mno-${nrc}`);
  return {
    nrc,
    mobileMoneyBalance: Math.round(rand() * 15000 + 50),
    averageMonthlyTransactions: Math.round(rand() * 50 + 5),
    totalTransactionVolume: Math.round(rand() * 100000 + 5000),
    accountAge: Math.floor(rand() * 84 + 6),
    airtime: Math.round(rand() * 500 + 20),
    source: ZAMBIAN_MNOS[Math.floor(rand() * ZAMBIAN_MNOS.length)] + " (Mock)",
  };
}

export function generateMfiData(nrc: string, existingLoans: Loan[]) {
  const rand = seededRandom(`mfi-${nrc}`);
  const totalLoans = existingLoans.length;
  const repaidCount = existingLoans.filter(l => l.status === "closed").length;
  const repaymentRate = totalLoans > 0 ? repaidCount / totalLoans : rand() * 0.3 + 0.6;

  return {
    nrc,
    loans: existingLoans.map(l => ({
      id: l.id,
      institution: l.institution,
      institutionType: l.institutionType,
      amount: Number(l.amount),
      currency: l.currency,
      outstandingBalance: Number(l.outstandingBalance),
      status: l.status,
      disbursedAt: l.disbursedAt.toISOString(),
      dueDate: l.dueDate?.toISOString() || null,
      interestRate: Number(l.interestRate),
      missedPayments: l.missedPayments,
    })),
    repaymentRate: Math.round(repaymentRate * 100) / 100,
    source: ZAMBIAN_MFIS[Math.floor(rand() * ZAMBIAN_MFIS.length)] + " (Mock)",
  };
}
