import { pgTable, text, timestamp, integer, bigint, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { institutionsTable } from "./institutions";
import { tenantsTable } from "./tenants";

/** A transmitted batch file and how validation went */
export const dataUploadsTable = pgTable("data_uploads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  uploadNo: text("upload_no").notNull().unique(),
  institutionId: text("institution_id").references(() => institutionsTable.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  format: text("format", { enum: ["crb_xml_v3", "csv_batch", "corrections"] }).notNull().default("crb_xml_v3"),
  period: text("period").notNull(),
  recordsSubmitted: integer("records_submitted").notNull().default(0),
  recordsAccepted: integer("records_accepted").notNull().default(0),
  recordsRejected: integer("records_rejected").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  status: text("status", { enum: ["validating", "accepted", "accepted_with_errors", "rejected", "failed"] })
    .notNull().default("validating"),
  uploadedBy: text("uploaded_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

/** Per-rule rejection detail for an upload */
export const validationErrorsTable = pgTable("validation_errors", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  uploadId: text("upload_id").notNull().references(() => dataUploadsTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  rule: text("rule").notNull(),
  affectedRecords: integer("affected_records").notNull().default(0),
  sampleLocation: text("sample_location").notNull().default(""),
  suggestedFix: text("suggested_fix").notNull().default(""),
  severity: text("severity", { enum: ["blocking", "warning"] }).notNull().default("blocking"),
  status: text("status", { enum: ["open", "resolved"] }).notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDataUploadSchema = createInsertSchema(dataUploadsTable).omit({ id: true, createdAt: true });
export type DataUpload = typeof dataUploadsTable.$inferSelect;
export type ValidationError = typeof validationErrorsTable.$inferSelect;
export type InsertDataUpload = z.infer<typeof insertDataUploadSchema>;
