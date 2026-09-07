import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { customersTable } from "./customers";

/**
 * Signals themselves are derived live from bureau data; this table only stores
 * the case state a tenant's team applies to a given signal.
 */
export const ewsActionsTable = pgTable("ews_actions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  signalType: text("signal_type").notNull(),
  status: text("status", { enum: ["open", "reviewing", "actioned", "dismissed"] }).notNull().default("open"),
  assignee: text("assignee").notNull().default(""),
  note: text("note"),
  actionTaken: text("action_taken"),
  updatedBy: text("updated_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("ews_unique_signal").on(t.tenantId, t.customerId, t.signalType)]);

export const insertEwsActionSchema = createInsertSchema(ewsActionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type EwsAction = typeof ewsActionsTable.$inferSelect;
export type InsertEwsAction = z.infer<typeof insertEwsActionSchema>;
