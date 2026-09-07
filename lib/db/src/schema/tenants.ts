import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenantsTable = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type", { enum: ["bank", "mfi", "fintech", "mno"] }).notNull(),
  status: text("status", { enum: ["active", "suspended", "inactive"] }).notNull().default("active"),
  contactEmail: text("contact_email").notNull(),
  apiKey: text("api_key").unique(),
  apiCallsThisMonth: integer("api_calls_this_month").notNull().default(0),
  totalQueries: integer("total_queries").notNull().default(0),
  kybStatus: text("kyb_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  kyb: jsonb("kyb").$type<{
    registrationNo?: string;
    tpin?: string;
    licenseNo?: string;
    regulator?: string;
    incorporationDate?: string;
    website?: string;
    phone?: string;
    address?: { street?: string; city?: string; province?: string };
    complianceOfficer?: { name?: string; email?: string; phone?: string };
    technicalContact?: { name?: string; email?: string };
    directors?: { name: string; idNumber: string; role: string; shareholding: number; pep: boolean }[];
    expectedMonthlyReports?: number;
    dataTypesContributed?: string[];
    purposes?: string[];
    pepDeclared?: boolean;
    amlPolicyConfirmed?: boolean;
  }>(),
  settings: jsonb("settings").$type<{
    scoringModel: "standard" | "conservative" | "aggressive";
    maxLoanAmount: number;
    requireConsent: boolean;
    allowedDataTypes: string[];
  }>().notNull().default({
    scoringModel: "standard",
    maxLoanAmount: 100000,
    requireConsent: true,
    allowedDataTypes: ["bank_data", "mobile_money", "mfi_loans", "credit_history"],
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
