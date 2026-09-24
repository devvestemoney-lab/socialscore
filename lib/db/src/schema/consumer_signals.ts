import { pgTable, text, timestamp, numeric, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

/**
 * Behavioural evidence outside traditional lending — rent, bills, refuse
 * collection, peer-to-peer loans, instalments and employment. One row is one observation reported
 * about a consumer, and the scoring dimensions are computed from these rather
 * than stored as opinions.
 */
export const consumerSignalsTable = pgTable("consumer_signals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  dimension: text("dimension", {
    enum: ["housing", "payments", "peer", "commerce", "stability"],
  }).notNull(),
  /** What kind of obligation this is: rent_payment, residence, utility_bill, refuse_collection,
   *  airtime_advance, mobile_money_loan, p2p_loan, savings_group_loan, bnpl_instalment, lay_by, employment */
  kind: text("kind").notNull(),
  /** Who reported it — a landlord, utility, council, P2P platform, savings group, retailer or employer */
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

/** Obligations reported by a landlord, council, utility, P2P platform,
 *  savings group, retailer or employer, matched to the consumer on NRC. */
export const signalIngestSchema = z.object({
  signals: z.array(z.object({
    nrc: z.string().min(1).max(20),
    dimension: z.enum(["housing", "payments", "peer", "commerce", "stability"]),
    kind: z.string().min(1).max(40),
    source: z.string().min(1).max(120),
    amount: z.coerce.number().nonnegative().optional(),
    dueDate: z.iso.date().optional(),
    paidDate: z.iso.date().optional(),
    status: z.enum(["on_time", "late", "missed", "ongoing", "ended"]),
    months: z.coerce.number().int().nonnegative().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).min(1).max(5000),
});
export type SignalIngest = z.infer<typeof signalIngestSchema>;
