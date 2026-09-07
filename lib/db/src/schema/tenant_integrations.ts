import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const webhooksTable = pgTable("webhooks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  description: text("description").notNull().default(""),
  events: jsonb("events").$type<string[]>().notNull().default([]),
  secretPrefix: text("secret_prefix").notNull().default(""),
  active: boolean("active").notNull().default(true),
  health: text("health", { enum: ["healthy", "degraded", "failing", "paused"] }).notNull().default("healthy"),
  lastDeliveryAt: timestamp("last_delivery_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const webhookDeliveriesTable = pgTable("webhook_deliveries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  webhookId: text("webhook_id").notNull().references(() => webhooksTable.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  responseCode: integer("response_code"),
  attempts: integer("attempts").notNull().default(1),
  durationMs: integer("duration_ms").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Connectors an institution runs against the platform */
export const tenantIntegrationsTable = pgTable("tenant_integrations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("data"),
  enabled: boolean("enabled").notNull().default(true),
  health: text("health", { enum: ["connected", "degraded", "not_configured", "disabled"] }).notNull().default("connected"),
  lastSyncAt: timestamp("last_sync_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWebhookSchema = createInsertSchema(webhooksTable).omit({ id: true, createdAt: true });
export type Webhook = typeof webhooksTable.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveriesTable.$inferSelect;
export type TenantIntegration = typeof tenantIntegrationsTable.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
