import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { disputesTable } from "./operations";
import { tenantsTable } from "./tenants";

/** Institution responses and evidence submitted against a dispute */
export const disputeResponsesTable = pgTable("dispute_responses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  disputeId: text("dispute_id").notNull().references(() => disputesTable.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
  kind: text("kind", { enum: ["response", "evidence", "note", "bureau_request"] }).notNull().default("response"),
  position: text("position", { enum: ["record_accurate", "record_corrected", "partially_upheld", "investigating"] }),
  body: text("body").notNull().default(""),
  attachments: jsonb("attachments").$type<string[]>().notNull().default([]),
  authorName: text("author_name").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDisputeResponseSchema = createInsertSchema(disputeResponsesTable).omit({ id: true, createdAt: true });
export type DisputeResponse = typeof disputeResponsesTable.$inferSelect;
export type InsertDisputeResponse = z.infer<typeof insertDisputeResponseSchema>;
