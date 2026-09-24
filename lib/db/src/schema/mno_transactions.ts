import { pgTable, text, timestamp, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const MNO_PROVIDERS = ["mtn", "airtel", "zamtel"] as const;

/** What a transaction was for, assigned at ingest from the MNO's transaction
 *  type and the counterparty. The cash-flow dimension reads these, never the
 *  raw counterparty, so recategorising a merchant only needs a rescore. */
export const MNO_CATEGORIES = [
  "income", "transfer_in", "transfer_out", "cash_in", "cash_out",
  "betting", "betting_win", "merchant", "bills", "airtime",
  "loan_disbursement", "loan_repayment", "fees", "other",
] as const;
export type MnoCategory = typeof MNO_CATEGORIES[number];

/**
 * Raw mobile money transactions reported by the MNOs. Held for twelve months
 * to support disputes and rescoring, then purged. Lenders never see these
 * rows — only the cash-flow figures and risk flags derived from them.
 */
export const mnoTransactionsTable = pgTable("mno_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: MNO_PROVIDERS }).notNull(),
  /** The MNO's own transaction id — unique per provider, so a resent file is harmless */
  reference: text("reference").notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  direction: text("direction", { enum: ["in", "out"] }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 14, scale: 2 }),
  /** The MNO's transaction type as sent, e.g. P2P, CASH_OUT, MERCHANT_PAY */
  mnoType: text("mno_type").notNull(),
  counterparty: text("counterparty"),
  category: text("category", { enum: MNO_CATEGORIES }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, t => [
  uniqueIndex("mno_txn_provider_reference").on(t.provider, t.reference),
  index("mno_txn_customer_time").on(t.customerId, t.occurredAt),
]);

export type MnoTransaction = typeof mnoTransactionsTable.$inferSelect;
export type InsertMnoTransaction = typeof mnoTransactionsTable.$inferInsert;

/** One transaction as an MNO sends it. The consumer is matched on NRC where
 *  the MNO's KYC holds it, otherwise on the MSISDN. */
export const mnoIngestSchema = z.object({
  provider: z.enum(MNO_PROVIDERS),
  transactions: z.array(z.object({
    reference: z.string().min(1).max(100),
    msisdn: z.string().min(9).max(20),
    nrc: z.string().max(20).optional(),
    occurredAt: z.coerce.date(),
    direction: z.enum(["in", "out"]),
    amount: z.coerce.number().positive(),
    balanceAfter: z.coerce.number().optional(),
    type: z.string().min(1).max(40),
    counterparty: z.string().max(120).optional(),
  })).min(1).max(5000),
});
export type MnoIngest = z.infer<typeof mnoIngestSchema>;
