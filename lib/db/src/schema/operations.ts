import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { tenantsTable } from "./tenants";

export const disputesTable = pgTable("disputes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  caseNo: text("case_no").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
  institutionName: text("institution_name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", {
    enum: ["open", "under_investigation", "awaiting_institution", "escalated", "resolved_upheld", "resolved_rejected", "dismissed"],
  }).notNull().default("open"),
  resolution: text("resolution"),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  dueAt: timestamp("due_at").notNull(), // statutory 21-day window
  resolvedAt: timestamp("resolved_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apiKeysTable = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  displayPrefix: text("display_prefix").notNull(), // e.g. "sscore_live_8f3a…"
  env: text("env", { enum: ["production", "sandbox"] }).notNull().default("production"),
  rateLimitRpm: integer("rate_limit_rpm").notNull().default(300),
  status: text("status", { enum: ["active", "suspended", "revoked"] }).notNull().default("active"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const integrationsTable = pgTable("integrations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("general"),
  enabled: boolean("enabled").notNull().default(true),
  health: text("health", { enum: ["connected", "degraded", "not_configured", "disabled"] }).notNull().default("connected"),
  lastSyncAt: timestamp("last_sync_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({ id: true, updatedAt: true });
export type Dispute = typeof disputesTable.$inferSelect;
export type ApiKey = typeof apiKeysTable.$inferSelect;
export type Integration = typeof integrationsTable.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
