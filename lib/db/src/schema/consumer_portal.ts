import { pgTable, text, timestamp, integer, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

/** One-time passcodes issued for consumer sign-in */
export const otpCodesTable = pgTable("otp_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  nrc: text("nrc").notNull(),
  code: text("code").notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Alerts raised to the consumer about their own file */
export const consumerAlertsTable = pgTable("consumer_alerts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  kind: text("kind", {
    enum: ["inquiry", "new_account", "score_change", "missed_payment", "dispute_update", "consent_change"],
  }).notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull().default("info"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Report downloads the consumer has requested */
export const reportDownloadsTable = pgTable("report_downloads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  reference: text("reference").notNull().unique(),
  format: text("format", { enum: ["pdf", "csv"] }).notNull().default("pdf"),
  kind: text("kind", { enum: ["full_report", "score_only", "dispute_pack"] }).notNull().default("full_report"),
  scoreAtIssue: integer("score_at_issue"),
  paid: boolean("paid").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Statutory free-report allowance and paid purchases */
export const consumerPaymentsTable = pgTable("consumer_payments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  reference: text("reference").notNull().unique(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method", { enum: ["mobile_money", "card", "free_allowance"] }).notNull().default("mobile_money"),
  status: text("status", { enum: ["paid", "pending", "failed", "waived"] }).notNull().default("paid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConsumerAlertSchema = createInsertSchema(consumerAlertsTable).omit({ id: true, createdAt: true });
export type OtpCode = typeof otpCodesTable.$inferSelect;
export type ConsumerAlert = typeof consumerAlertsTable.$inferSelect;
export type ReportDownload = typeof reportDownloadsTable.$inferSelect;
export type ConsumerPayment = typeof consumerPaymentsTable.$inferSelect;
export type InsertConsumerAlert = z.infer<typeof insertConsumerAlertSchema>;
