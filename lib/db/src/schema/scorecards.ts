import { pgTable, text, timestamp, numeric, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const scorecardsTable = pgTable("scorecards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  version: text("version").notNull(),
  segment: text("segment", { enum: ["consumer", "sme", "micro", "thin_file"] }).notNull().default("consumer"),
  status: text("status", { enum: ["draft", "production", "monitoring", "retired"] }).notNull().default("draft"),
  /** Factor weights, must total 100 */
  weights: jsonb("weights").$type<Record<string, number>>().notNull().default({}),
  thresholds: jsonb("thresholds").$type<{
    autoApprove: number; manualReview: number; autoDecline: number; maxLoanToIncome: number;
  }>().notNull(),
  gini: numeric("gini", { precision: 4, scale: 3 }),
  ks: numeric("ks", { precision: 4, scale: 3 }),
  psi: numeric("psi", { precision: 4, scale: 3 }),
  notes: text("notes").notNull().default(""),
  owner: text("owner").notNull().default(""),
  deployedAt: timestamp("deployed_at"),
  retiredAt: timestamp("retired_at"),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("scorecard_unique_version").on(t.name, t.version)]);

/** Champion/challenger split for a segment */
export const abTestsTable = pgTable("ab_tests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  segment: text("segment").notNull().unique(),
  championId: text("champion_id").references(() => scorecardsTable.id, { onDelete: "set null" }),
  challengerId: text("challenger_id").references(() => scorecardsTable.id, { onDelete: "set null" }),
  challengerTrafficPct: numeric("challenger_traffic_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  enabled: boolean("enabled").notNull().default(false),
  startedAt: timestamp("started_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Fraud case state applied to a flagged tenant */
export const fraudCasesTable = pgTable("fraud_cases", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  signal: text("signal").notNull(),
  status: text("status", { enum: ["open", "investigating", "cleared", "escalated"] }).notNull().default("open"),
  note: text("note"),
  updatedBy: text("updated_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("fraud_unique_signal").on(t.tenantId, t.signal)]);

export const insertScorecardSchema = createInsertSchema(scorecardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Scorecard = typeof scorecardsTable.$inferSelect;
export type AbTest = typeof abTestsTable.$inferSelect;
export type FraudCase = typeof fraudCasesTable.$inferSelect;
export type InsertScorecard = z.infer<typeof insertScorecardSchema>;
