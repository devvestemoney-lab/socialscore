import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { tenantsTable } from "./tenants";

export const consentsTable = pgTable("consents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  dataType: text("data_type", { 
    enum: ["bank_data", "mobile_money", "mfi_loans", "credit_history", "personal_info"] 
  }).notNull(),
  status: text("status", { enum: ["active", "revoked"] }).notNull().default("active"),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConsentSchema = createInsertSchema(consentsTable).omit({ id: true, createdAt: true });
export type InsertConsent = z.infer<typeof insertConsentSchema>;
export type Consent = typeof consentsTable.$inferSelect;
