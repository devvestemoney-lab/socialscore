import { pgTable, text, timestamp, integer, numeric, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const pricingPlansTable = pgTable("pricing_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  tier: integer("tier").notNull().default(1),
  monthlyPrice: numeric("monthly_price", { precision: 12, scale: 2 }).notNull(),
  includedReports: integer("included_reports").notNull().default(0),
  includedApiCalls: integer("included_api_calls").notNull().default(0),
  includedSeats: integer("included_seats").notNull().default(0), // 0 = unlimited
  overageRatePerReport: numeric("overage_rate_per_report", { precision: 10, scale: 2 }).notNull().default("35"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const planAddonsTable = pgTable("plan_addons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit", { enum: ["per_month", "per_report"] }).notNull().default("per_month"),
  active: boolean("active").notNull().default(true),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => pricingPlansTable.id),
  status: text("status", { enum: ["active", "trialing", "past_due", "cancelled"] }).notNull().default("active"),
  addons: jsonb("addons").$type<string[]>().notNull().default([]),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  renewsAt: timestamp("renews_at"),
  contractEndsAt: timestamp("contract_ends_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("subscription_unique_tenant").on(t.tenantId)]);

export const invoicesTable = pgTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reference: text("reference").notNull().unique(),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // YYYY-MM
  subscriptionAmount: numeric("subscription_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  overageAmount: numeric("overage_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  addonsAmount: numeric("addons_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status", { enum: ["draft", "issued", "paid", "overdue", "void"] }).notNull().default("issued"),
  lineItems: jsonb("line_items").$type<{ label: string; qty: number; rate: number; amount: number }[]>().notNull().default([]),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  dueAt: timestamp("due_at"),
  paidAt: timestamp("paid_at"),
}, t => [uniqueIndex("invoice_unique_tenant_period").on(t.tenantId, t.period)]);

export const insertPricingPlanSchema = createInsertSchema(pricingPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type PricingPlan = typeof pricingPlansTable.$inferSelect;
export type PlanAddon = typeof planAddonsTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
