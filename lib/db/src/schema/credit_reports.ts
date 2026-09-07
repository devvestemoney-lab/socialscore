import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { tenantsTable } from "./tenants";
import { creditInquiriesTable } from "./credit_inquiries";

export const creditReportsTable = pgTable("credit_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reference: text("reference").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
  institutionName: text("institution_name").notNull(),
  inquiryId: text("inquiry_id").references(() => creditInquiriesTable.id, { onDelete: "set null" }),
  purpose: text("purpose").notNull(),
  score: integer("score"),
  band: text("band"),
  status: text("status", { enum: ["delivered", "partial", "failed"] }).notNull().default("delivered"),
  generationMs: integer("generation_ms").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCreditReportSchema = createInsertSchema(creditReportsTable).omit({ id: true, createdAt: true });
export type InsertCreditReport = z.infer<typeof insertCreditReportSchema>;
export type CreditReport = typeof creditReportsTable.$inferSelect;
