import { pgTable, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { institutionsTable } from "./institutions";

/** Monthly data contribution cycles per institution */
export const dataSubmissionsTable = pgTable("data_submissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  institutionId: text("institution_id").notNull().references(() => institutionsTable.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // e.g. "2026-08"
  recordsSubmitted: integer("records_submitted").notNull().default(0),
  recordsAccepted: integer("records_accepted").notNull().default(0),
  recordsRejected: integer("records_rejected").notNull().default(0),
  status: text("status", { enum: ["processing", "accepted", "partial", "rejected", "overdue"] }).notNull().default("processing"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Per-institution data quality assessment for a period */
export const dataQualityReviewsTable = pgTable("data_quality_reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  institutionId: text("institution_id").notNull().references(() => institutionsTable.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  completeness: numeric("completeness", { precision: 5, scale: 2 }).notNull(),
  accuracy: numeric("accuracy", { precision: 5, scale: 2 }).notNull(),
  timeliness: numeric("timeliness", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dataQualityIssuesTable = pgTable("data_quality_issues", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  institutionId: text("institution_id").references(() => institutionsTable.id, { onDelete: "set null" }),
  sourceLabel: text("source_label").notNull(), // shown when spanning multiple sources
  issue: text("issue").notNull(),
  affectedRecords: integer("affected_records").notNull().default(0),
  severity: text("severity", { enum: ["high", "medium", "low"] }).notNull(),
  status: text("status", { enum: ["open", "resolved"] }).notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Pipeline batch jobs; running jobs advance progress lazily on read */
export const processingJobsTable = pgTable("processing_jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobNo: text("job_no").notNull().unique(),
  type: text("type").notNull(),
  source: text("source").notNull(),
  records: integer("records").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  status: text("status", { enum: ["queued", "running", "completed", "completed_with_errors", "failed", "cancelled"] }).notNull().default("queued"),
  ratePctPerSec: numeric("rate_pct_per_sec", { precision: 6, scale: 3 }).notNull().default("2"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDataSubmissionSchema = createInsertSchema(dataSubmissionsTable).omit({ id: true, createdAt: true });
export type DataSubmission = typeof dataSubmissionsTable.$inferSelect;
export type DataQualityReview = typeof dataQualityReviewsTable.$inferSelect;
export type DataQualityIssue = typeof dataQualityIssuesTable.$inferSelect;
export type ProcessingJob = typeof processingJobsTable.$inferSelect;
export type InsertDataSubmission = z.infer<typeof insertDataSubmissionSchema>;
