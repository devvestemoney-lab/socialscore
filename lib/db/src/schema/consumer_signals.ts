import { pgTable, text, timestamp, numeric, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

/**
 * Behavioural evidence outside traditional lending — rent, bills, instalments,
 * employment, school fees, endorsements. One row is one observation reported
 * about a consumer, and the scoring dimensions are computed from these rather
 * than stored as opinions.
 */
export const consumerSignalsTable = pgTable("consumer_signals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  dimension: text("dimension", {
    enum: ["housing", "payments", "commerce", "stability", "education", "reputation"],
  }).notNull(),
  /** What kind of obligation this is: rent_payment, utility_bill, bnpl_instalment, school_fee, employment, residence, endorsement */
  kind: text("kind").notNull(),
  /** Who reported it — a landlord, utility, retailer, employer or school */
  source: text("source").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  dueDate: text("due_date"),
  paidDate: text("paid_date"),
  status: text("status", {
    enum: ["on_time", "late", "missed", "ongoing", "ended"],
  }).notNull(),
  /** Duration in months, for tenure-style signals like employment and residence */
  months: integer("months"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => [
  index("consumer_signal_customer").on(t.customerId),
  index("consumer_signal_dimension").on(t.customerId, t.dimension),
]);

export const insertConsumerSignalSchema = createInsertSchema(consumerSignalsTable).omit({ id: true, createdAt: true });
export type ConsumerSignal = typeof consumerSignalsTable.$inferSelect;
export type InsertConsumerSignal = z.infer<typeof insertConsumerSignalSchema>;
