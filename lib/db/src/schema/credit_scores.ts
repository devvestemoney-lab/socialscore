import { pgTable, text, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export interface ReasonCode {
  dimension: string;
  /** "negative" pulls the score down, "positive" holds it up */
  effect: "negative" | "positive";
  text: string;
}

export interface RiskFlag {
  code: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
}

export const creditScoresTable = pgTable("credit_scores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  score: numeric("score", { precision: 10, scale: 2 }).notNull(),
  rating: text("rating", { enum: ["Excellent", "Good", "Fair", "Poor", "Very Poor"] }).notNull(),
  probabilityOfDefault: numeric("probability_of_default", { precision: 5, scale: 4 }).notNull(),
  scoreBreakdown: jsonb("score_breakdown").$type<{
    repaymentHistory: number;
    loanDefaults: number;
    transactionPatterns: number;
    mobileMoney: number;
    accountAge: number;
  }>().notNull(),
  /** The seven weighted scoring dimensions, each 0-100. Null means the
      consumer has no evidence for that dimension and its weight was
      redistributed across the others. */
  dimensions: jsonb("dimensions").$type<Record<string, number | null>>(),
  /** Share of the scorecard's weight that had evidence behind it */
  coverage: integer("coverage"),
  /** Which scorecard produced this score, e.g. "SocialScore Consumer v4.2" */
  scorecardVersion: text("scorecard_version"),
  /** The main things pulling the score down or holding it up, strongest first */
  reasonCodes: jsonb("reason_codes").$type<ReasonCode[]>(),
  /** Behaviour a lender should look at regardless of the score, e.g. heavy betting */
  riskFlags: jsonb("risk_flags").$type<RiskFlag[]>(),
  /** Cash-flow figures derived from mobile money, as they stood when scored */
  cashflow: jsonb("cashflow").$type<Record<string, number | null>>(),
  recommendation: text("recommendation").notNull(),
  aiInsights: text("ai_insights"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCreditScoreSchema = createInsertSchema(creditScoresTable).omit({ id: true, createdAt: true });
export type InsertCreditScore = z.infer<typeof insertCreditScoreSchema>;
export type CreditScore = typeof creditScoresTable.$inferSelect;
