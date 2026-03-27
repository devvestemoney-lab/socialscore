import { Loan } from "@workspace/db";

export interface ScoringInput {
  loans: Loan[];
  mobileMoneyBalance: number;
  avgMonthlyTransactions: number;
  totalTransactionVolume: number;
  accountAgeMonths: number;
}

export interface ScoringResult {
  score: number;
  rating: "Excellent" | "Good" | "Fair" | "Poor" | "Very Poor";
  probabilityOfDefault: number;
  breakdown: {
    repaymentHistory: number;
    loanDefaults: number;
    transactionPatterns: number;
    mobileMoney: number;
    accountAge: number;
  };
  recommendation: string;
  aiInsights: string;
  riskLevel: "Low" | "Medium" | "High" | "Very High" | "Critical";
  riskFactors: Array<{ factor: string; impact: "positive" | "negative" | "neutral"; description: string; weight: number }>;
  recommendedCreditLimit: number;
}

export function calculateCreditScore(input: ScoringInput): ScoringResult {
  const activeLoans = input.loans.filter(l => l.status === "active");
  const defaultedLoans = input.loans.filter(l => l.status === "defaulted" || l.status === "written_off");
  const closedLoans = input.loans.filter(l => l.status === "closed");
  const totalLoans = input.loans.length;

  const totalMissedPayments = input.loans.reduce((sum, l) => sum + l.missedPayments, 0);
  const repaymentRate = totalLoans > 0 ? (closedLoans.length / totalLoans) : 0;

  // Component 1: Repayment History (0-300)
  let repaymentScore = 300;
  repaymentScore -= totalMissedPayments * 20;
  repaymentScore += repaymentRate * 100;
  repaymentScore = Math.max(0, Math.min(300, repaymentScore));

  // Component 2: Loan Defaults (0-200)
  let defaultScore = 200;
  defaultScore -= defaultedLoans.length * 60;
  defaultScore = Math.max(0, Math.min(200, defaultScore));

  // Component 3: Transaction Patterns (0-250)
  let transactionScore = 0;
  if (input.avgMonthlyTransactions >= 20) transactionScore = 250;
  else if (input.avgMonthlyTransactions >= 10) transactionScore = 175;
  else if (input.avgMonthlyTransactions >= 5) transactionScore = 100;
  else transactionScore = 50;

  const volumeBonus = Math.min(50, input.totalTransactionVolume / 5000);
  transactionScore = Math.min(250, transactionScore + volumeBonus);

  // Component 4: Mobile Money (0-150)
  let mobileScore = 0;
  if (input.mobileMoneyBalance >= 10000) mobileScore = 150;
  else if (input.mobileMoneyBalance >= 5000) mobileScore = 100;
  else if (input.mobileMoneyBalance >= 1000) mobileScore = 60;
  else if (input.mobileMoneyBalance >= 100) mobileScore = 30;
  else mobileScore = 10;

  // Component 5: Account Age (0-100)
  let ageScore = 0;
  if (input.accountAgeMonths >= 60) ageScore = 100;
  else if (input.accountAgeMonths >= 36) ageScore = 75;
  else if (input.accountAgeMonths >= 24) ageScore = 55;
  else if (input.accountAgeMonths >= 12) ageScore = 35;
  else ageScore = 15;

  const totalScore = Math.round(repaymentScore + defaultScore + transactionScore + mobileScore + ageScore);
  const clampedScore = Math.max(0, Math.min(1000, totalScore));

  // Rating
  let rating: ScoringResult["rating"];
  if (clampedScore >= 751) rating = "Excellent";
  else if (clampedScore >= 601) rating = "Good";
  else if (clampedScore >= 451) rating = "Fair";
  else if (clampedScore >= 301) rating = "Poor";
  else rating = "Very Poor";

  // Probability of Default (logistic regression approximation)
  const normalizedScore = clampedScore / 1000;
  const logit = -4 + (1 - normalizedScore) * 6 + defaultedLoans.length * 1.5 + totalMissedPayments * 0.3;
  const probabilityOfDefault = Math.max(0.01, Math.min(0.99, 1 / (1 + Math.exp(-logit))));

  // Risk level
  let riskLevel: ScoringResult["riskLevel"];
  if (probabilityOfDefault < 0.1) riskLevel = "Low";
  else if (probabilityOfDefault < 0.25) riskLevel = "Medium";
  else if (probabilityOfDefault < 0.45) riskLevel = "High";
  else if (probabilityOfDefault < 0.65) riskLevel = "Very High";
  else riskLevel = "Critical";

  // Recommended credit limit
  const baseLimit = clampedScore * 200; // ZMW
  const exposureAdjustment = Math.max(0, 1 - activeLoans.length * 0.15);
  const recommendedCreditLimit = Math.round(baseLimit * exposureAdjustment);

  // Risk factors
  const riskFactors: ScoringResult["riskFactors"] = [];
  if (defaultedLoans.length === 0) {
    riskFactors.push({ factor: "No defaults", impact: "positive", description: "Customer has no loan defaults on record", weight: 0.25 });
  } else {
    riskFactors.push({ factor: "Loan defaults", impact: "negative", description: `${defaultedLoans.length} defaulted loan(s) found`, weight: 0.25 });
  }
  if (totalMissedPayments === 0) {
    riskFactors.push({ factor: "Payment punctuality", impact: "positive", description: "No missed payments recorded", weight: 0.2 });
  } else {
    riskFactors.push({ factor: "Missed payments", impact: "negative", description: `${totalMissedPayments} missed payment(s) recorded`, weight: 0.2 });
  }
  if (input.mobileMoneyBalance > 5000) {
    riskFactors.push({ factor: "Mobile money activity", impact: "positive", description: "Active mobile money user with healthy balance", weight: 0.15 });
  } else {
    riskFactors.push({ factor: "Low mobile money usage", impact: "neutral", description: "Limited mobile money activity", weight: 0.1 });
  }
  if (input.accountAgeMonths >= 24) {
    riskFactors.push({ factor: "Established credit history", impact: "positive", description: `${input.accountAgeMonths} months of credit history`, weight: 0.15 });
  } else {
    riskFactors.push({ factor: "Limited credit history", impact: "negative", description: "Short credit history period", weight: 0.15 });
  }
  if (activeLoans.length > 3) {
    riskFactors.push({ factor: "Multiple active loans", impact: "negative", description: `${activeLoans.length} concurrent active loans indicating high leverage`, weight: 0.2 });
  }

  const recommendation = clampedScore >= 651
    ? "Approve — Strong credit profile. Standard terms recommended."
    : clampedScore >= 501
    ? "Consider — Moderate risk. Apply conservative lending terms with smaller initial limit."
    : clampedScore >= 351
    ? "Refer — Higher risk profile. Require additional collateral or guarantor."
    : "Decline — High risk of default. Insufficient creditworthiness.";

  const aiInsights = generateAiInsights(clampedScore, riskLevel, defaultedLoans.length, totalMissedPayments, input.accountAgeMonths, repaymentRate);

  return {
    score: clampedScore,
    rating,
    probabilityOfDefault: Math.round(probabilityOfDefault * 10000) / 10000,
    breakdown: {
      repaymentHistory: Math.round(repaymentScore),
      loanDefaults: Math.round(defaultScore),
      transactionPatterns: Math.round(transactionScore),
      mobileMoney: Math.round(mobileScore),
      accountAge: Math.round(ageScore),
    },
    recommendation,
    aiInsights,
    riskLevel,
    riskFactors,
    recommendedCreditLimit,
  };
}

function generateAiInsights(score: number, risk: string, defaults: number, missed: number, ageMonths: number, repayRate: number): string {
  const parts = [];
  
  if (score >= 750) {
    parts.push("This customer demonstrates excellent financial discipline with a strong track record.");
  } else if (score >= 600) {
    parts.push("This customer shows generally good financial behavior with minor areas for improvement.");
  } else if (score >= 450) {
    parts.push("This customer presents a moderate risk profile requiring careful consideration.");
  } else {
    parts.push("This customer presents elevated credit risk based on the available financial data.");
  }

  if (defaults > 0) {
    parts.push(`Historical defaults (${defaults}) significantly impact the risk assessment.`);
  }
  if (missed > 0) {
    parts.push(`${missed} missed payment(s) suggest occasional cash flow constraints.`);
  }
  if (ageMonths >= 36) {
    parts.push(`A ${Math.floor(ageMonths / 12)}-year credit history provides a reliable assessment baseline.`);
  }
  if (repayRate > 0.8) {
    parts.push("High loan completion rate indicates responsible debt management.");
  }

  return parts.join(" ");
}
