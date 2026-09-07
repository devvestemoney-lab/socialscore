import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const branchesTable = pgTable("branches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  province: text("province").notNull().default(""),
  managerName: text("manager_name").notNull().default(""),
  status: text("status", { enum: ["active", "pending_setup", "closed"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => [uniqueIndex("branch_unique_code").on(t.tenantId, t.code)]);

export const tenantSecuritySettingsTable = pgTable("tenant_security_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
  updatedBy: text("updated_by").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("security_unique_key").on(t.tenantId, t.key)]);

/** Authentication events, used for access history and security review */
export const loginEventsTable = pgTable("login_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  email: text("email").notNull(),
  outcome: text("outcome", { enum: ["success", "bad_credentials", "inactive_account"] }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ id: true, createdAt: true });
export type Branch = typeof branchesTable.$inferSelect;
export type TenantSecuritySetting = typeof tenantSecuritySettingsTable.$inferSelect;
export type LoginEvent = typeof loginEventsTable.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
