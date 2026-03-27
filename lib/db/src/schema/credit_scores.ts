import { pgTable, text, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

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
  recommendation: text("recommendation").notNull(),
  aiInsights: text("ai_insights"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCreditScoreSchema = createInsertSchema(creditScoresTable).omit({ id: true, createdAt: true });
export type InsertCreditScore = z.infer<typeof insertCreditScoreSchema>;
export type CreditScore = typeof creditScoresTable.$inferSelect;
