import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { tenantsTable } from "./tenants";

export const creditInquiriesTable = pgTable("credit_inquiries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
  institutionName: text("institution_name").notNull(),
  kind: text("kind", { enum: ["hard", "soft"] }).notNull(),
  purpose: text("purpose").notNull(),
  outcome: text("outcome", { enum: ["report_issued", "declined_no_consent", "declined_policy"] }).notNull().default("report_issued"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCreditInquirySchema = createInsertSchema(creditInquiriesTable).omit({ id: true, createdAt: true });
export type InsertCreditInquiry = z.infer<typeof insertCreditInquirySchema>;
export type CreditInquiry = typeof creditInquiriesTable.$inferSelect;
