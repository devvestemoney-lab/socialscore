import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { customersTable } from "./customers";

export const watchlistsTable = pgTable("watchlists", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category", {
    enum: ["risk", "recovery", "retention", "compliance", "growth", "operational"],
  }).notNull().default("risk"),
  priority: text("priority", { enum: ["critical", "high", "medium", "low"] }).notNull().default("medium"),
  owner: text("owner").notNull().default(""),
  reviewCadence: text("review_cadence", { enum: ["daily", "weekly", "fortnightly", "monthly", "quarterly"] }).notNull().default("weekly"),
  /** Which bureau events raise an alert for members of this list */
  triggers: jsonb("triggers").$type<string[]>().notNull().default([]),
  /** Delivery channels for those alerts */
  channels: jsonb("channels").$type<string[]>().notNull().default(["in_app"]),
  /** Auto-enrolment rules evaluated against the tenant's book */
  criteria: jsonb("criteria").$type<{
    maxScore?: number | null;
    minScore?: number | null;
    minMissedPayments?: number | null;
    minExposure?: number | null;
    relationships?: string[];
  }>().notNull().default({}),
  autoEnrol: boolean("auto_enrol").notNull().default(false),
  active: boolean("active").notNull().default(true),
  nextReviewAt: timestamp("next_review_at"),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const watchlistMembersTable = pgTable("watchlist_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  watchlistId: text("watchlist_id").notNull().references(() => watchlistsTable.id, { onDelete: "cascade" }),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull().default(""),
  addedBy: text("added_by").notNull().default(""),
  source: text("source", { enum: ["manual", "auto"] }).notNull().default("manual"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWatchlistSchema = createInsertSchema(watchlistsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Watchlist = typeof watchlistsTable.$inferSelect;
export type WatchlistMember = typeof watchlistMembersTable.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
