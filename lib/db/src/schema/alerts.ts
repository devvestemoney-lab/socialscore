import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  severity: text("severity", { enum: ["critical", "high", "medium", "low"] }).notNull(),
  title: text("title").notNull(),
  source: text("source").notNull(), // originating module
  scope: text("scope").notNull().default("Platform"), // tenant / institution / Platform
  status: text("status", { enum: ["open", "acknowledged", "resolved"] }).notNull().default("open"),
  /** stable key so automated detections are not re-inserted on every scan */
  dedupeKey: text("dedupe_key").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Alert = typeof alertsTable.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
