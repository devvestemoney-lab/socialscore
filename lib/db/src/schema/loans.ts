import { pgTable, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const loansTable = pgTable("loans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  institutionType: text("institution_type", { enum: ["bank", "mfi", "mno"] }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("ZMW"),
  outstandingBalance: numeric("outstanding_balance", { precision: 15, scale: 2 }).notNull(),
  status: text("status", { enum: ["active", "defaulted", "closed", "written_off"] }).notNull(),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull(),
  missedPayments: integer("missed_payments").notNull().default(0),
  disbursedAt: timestamp("disbursed_at").notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLoanSchema = createInsertSchema(loansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loansTable.$inferSelect;
