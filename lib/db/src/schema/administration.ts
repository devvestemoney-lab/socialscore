import { pgTable, text, timestamp, integer, boolean, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const platformSettingsTable = pgTable("platform_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  groupName: text("group_name").notNull(), // General | Security | Data Retention | Notifications
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const featureFlagsTable = pgTable("feature_flags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  stage: text("stage", { enum: ["experimental", "beta", "ga", "deprecated"] }).notNull().default("experimental"),
  rollout: integer("rollout").notNull().default(0),
  envs: jsonb("envs").$type<string[]>().notNull().default([]),
  owner: text("owner").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const complianceFrameworksTable = pgTable("compliance_frameworks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  scope: text("scope").notNull().default(""),
  progress: integer("progress").notNull().default(0),
  status: text("status", { enum: ["compliant", "in_progress", "at_risk"] }).notNull().default("in_progress"),
  reviewNote: text("review_note").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const complianceFindingsTable = pgTable("compliance_findings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(), // FND-118
  finding: text("finding").notNull(),
  framework: text("framework").notNull(),
  severity: text("severity", { enum: ["high", "medium", "low"] }).notNull(),
  owner: text("owner").notNull().default(""),
  status: text("status", { enum: ["open", "in_remediation", "closed"] }).notNull().default("open"),
  dueAt: timestamp("due_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const incidentsTable = pgTable("incidents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(), // INC-2044
  title: text("title").notNull(),
  impact: text("impact", { enum: ["major", "minor", "maintenance"] }).notNull().default("minor"),
  status: text("status", { enum: ["investigating", "monitoring", "resolved"] }).notNull().default("investigating"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type PlatformSetting = typeof platformSettingsTable.$inferSelect;
export type FeatureFlag = typeof featureFlagsTable.$inferSelect;
export type ComplianceFramework = typeof complianceFrameworksTable.$inferSelect;
export type ComplianceFinding = typeof complianceFindingsTable.$inferSelect;
export type Incident = typeof incidentsTable.$inferSelect;
export const insertFeatureFlagSchema = createInsertSchema(featureFlagsTable).omit({ id: true, updatedAt: true });
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
