import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const institutionsTable = pgTable("institutions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["commercial_bank", "microfinance", "mobile_money", "utility", "fintech", "retailer"],
  }).notNull(),
  licenseNo: text("license_no").notNull().unique(),
  branches: integer("branches").notNull().default(0),
  dataFeeds: integer("data_feeds").notNull().default(1),
  status: text("status", { enum: ["active", "suspended", "onboarding"] }).notNull().default("onboarding"),
  contactEmail: text("contact_email").notNull(),
  tenantId: text("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
  memberSince: timestamp("member_since").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInstitutionSchema = createInsertSchema(institutionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstitution = z.infer<typeof insertInstitutionSchema>;
export type Institution = typeof institutionsTable.$inferSelect;
