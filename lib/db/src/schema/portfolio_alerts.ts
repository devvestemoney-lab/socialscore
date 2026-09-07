import { pgTable, text, timestamp, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

/** Per-tenant risk appetite thresholds; metrics are evaluated live against these */
export const riskAppetiteTable = pgTable("risk_appetite", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  metricKey: text("metric_key").notNull(),
  threshold: numeric("threshold", { precision: 12, scale: 2 }).notNull(),
  updatedBy: text("updated_by").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("appetite_unique_metric").on(t.tenantId, t.metricKey)]);

/** Case state applied to a breached metric */
export const portfolioAlertStatesTable = pgTable("portfolio_alert_states", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  metricKey: text("metric_key").notNull(),
  status: text("status", { enum: ["open", "acknowledged", "resolved"] }).notNull().default("open"),
  note: text("note"),
  updatedBy: text("updated_by").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("palert_unique_metric").on(t.tenantId, t.metricKey)]);

export const insertRiskAppetiteSchema = createInsertSchema(riskAppetiteTable).omit({ id: true, updatedAt: true });
export type RiskAppetite = typeof riskAppetiteTable.$inferSelect;
export type PortfolioAlertState = typeof portfolioAlertStatesTable.$inferSelect;
export type InsertRiskAppetite = z.infer<typeof insertRiskAppetiteSchema>;
