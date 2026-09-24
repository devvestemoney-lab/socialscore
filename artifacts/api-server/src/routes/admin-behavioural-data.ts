import { Router, type IRouter } from "express";
import {
  db, customersTable, consumerSignalsTable, mnoTransactionsTable,
  mnoIngestSchema, signalIngestSchema, type InsertMnoTransaction,
} from "@workspace/db";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";
import { categorise } from "../lib/mno.js";
import { scoreConsumer } from "../lib/score-consumer.js";

/**
 * Ingest for the behavioural data the score is built from — mobile money
 * transactions from the MNOs, and rent, refuse collection, peer lending and
 * other obligations from their reporters. Until the live integrations exist
 * these are loaded by the bureau; every consumer touched is rescored.
 */
const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")] as const;

/** Raw MNO transactions are held twelve months, then purged. */
const RETENTION_DAYS = 365;
const last9 = (phone: string) => phone.replace(/\D/g, "").slice(-9);

async function purgeExpired() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  const purged = await db.delete(mnoTransactionsTable)
    .where(lt(mnoTransactionsTable.occurredAt, cutoff))
    .returning({ id: mnoTransactionsTable.id });
  return purged.length;
}

async function rescore(customerIds: string[]) {
  let scored = 0, unscorable = 0;
  for (const id of customerIds) {
    const outcome = await scoreConsumer(id);
    if (outcome.scorable) scored++; else unscorable++;
  }
  return { scored, unscorable };
}

router.post("/mno/transactions", ...superAdmin, async (req: AuthRequest, res) => {
  const parsed = mnoIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid transaction file", issues: parsed.error.issues.slice(0, 20) });
    return;
  }
  const { provider, transactions } = parsed.data;

  // Match on NRC where the MNO sent one, otherwise on the last nine digits of the MSISDN
  const nrcs = [...new Set(transactions.map(t => t.nrc).filter((n): n is string => !!n))];
  const phones = [...new Set(transactions.map(t => last9(t.msisdn)))];
  const [byNrc, byPhone] = await Promise.all([
    nrcs.length ? db.select({ id: customersTable.id, nrc: customersTable.nrc }).from(customersTable)
      .where(inArray(customersTable.nrc, nrcs)) : Promise.resolve([]),
    db.select({ id: customersTable.id, key: sql<string>`right(regexp_replace(${customersTable.phone}, '\\D', '', 'g'), 9)` })
      .from(customersTable)
      .where(inArray(sql`right(regexp_replace(${customersTable.phone}, '\\D', '', 'g'), 9)`, phones)),
  ]);
  const nrcMap = new Map(byNrc.map(c => [c.nrc, c.id]));
  const phoneMap = new Map(byPhone.map(c => [c.key, c.id]));

  const rows: InsertMnoTransaction[] = [];
  const unmatched: string[] = [];
  for (const t of transactions) {
    const customerId = (t.nrc && nrcMap.get(t.nrc)) || phoneMap.get(last9(t.msisdn));
    if (!customerId) { unmatched.push(t.reference); continue; }
    rows.push({
      customerId, provider, reference: t.reference, occurredAt: t.occurredAt,
      direction: t.direction, amount: t.amount.toFixed(2),
      balanceAfter: t.balanceAfter == null ? null : t.balanceAfter.toFixed(2),
      mnoType: t.type, counterparty: t.counterparty ?? null,
      category: categorise({ mnoType: t.type, direction: t.direction, counterparty: t.counterparty }),
    });
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 1000) {
    const done = await db.insert(mnoTransactionsTable).values(rows.slice(i, i + 1000))
      .onConflictDoNothing({ target: [mnoTransactionsTable.provider, mnoTransactionsTable.reference] })
      .returning({ id: mnoTransactionsTable.id });
    inserted += done.length;
  }

  const purged = await purgeExpired();
  const affected = [...new Set(rows.map(r => r.customerId))];
  const scoring = await rescore(affected);

  res.status(201).json({
    received: transactions.length,
    inserted,
    duplicates: rows.length - inserted,
    unmatched: unmatched.length,
    unmatchedReferences: unmatched.slice(0, 50),
    purged,
    consumersRescored: scoring,
  });
});

router.post("/signals", ...superAdmin, async (req: AuthRequest, res) => {
  const parsed = signalIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid signal file", issues: parsed.error.issues.slice(0, 20) });
    return;
  }
  const { signals } = parsed.data;
  const nrcs = [...new Set(signals.map(s => s.nrc))];
  const customers = await db.select({ id: customersTable.id, nrc: customersTable.nrc })
    .from(customersTable).where(inArray(customersTable.nrc, nrcs));
  const byNrc = new Map(customers.map(c => [c.nrc, c.id]));

  const rows = signals.flatMap(s => {
    const customerId = byNrc.get(s.nrc);
    if (!customerId) return [];
    return [{
      customerId, dimension: s.dimension, kind: s.kind, source: s.source,
      amount: s.amount == null ? null : s.amount.toFixed(2),
      dueDate: s.dueDate ?? null, paidDate: s.paidDate ?? null,
      status: s.status, months: s.months ?? null, metadata: s.metadata ?? {},
    }];
  });
  const unmatched = [...new Set(signals.filter(s => !byNrc.has(s.nrc)).map(s => s.nrc))];

  for (let i = 0; i < rows.length; i += 1000) {
    await db.insert(consumerSignalsTable).values(rows.slice(i, i + 1000));
  }
  const scoring = await rescore([...new Set(rows.map(r => r.customerId))]);

  res.status(201).json({
    received: signals.length, inserted: rows.length,
    unmatchedNrcs: unmatched, consumersRescored: scoring,
  });
});

/** The raw transactions behind a consumer's cash-flow figures — for resolving disputes. */
router.get("/consumers/:id/mno-transactions", ...superAdmin, async (req, res) => {
  const id = String(req.params.id);
  const category = String(req.query.category ?? "");
  const limit = Math.min(500, Number(req.query.limit) || 100);
  const where = category
    ? and(eq(mnoTransactionsTable.customerId, id), eq(mnoTransactionsTable.category, category as "betting"))
    : eq(mnoTransactionsTable.customerId, id);

  const [rows, summary] = await Promise.all([
    db.select().from(mnoTransactionsTable).where(where)
      .orderBy(desc(mnoTransactionsTable.occurredAt)).limit(limit),
    db.select({
      category: mnoTransactionsTable.category,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${mnoTransactionsTable.amount}), 0)::float`,
    }).from(mnoTransactionsTable).where(eq(mnoTransactionsTable.customerId, id))
      .groupBy(mnoTransactionsTable.category),
  ]);
  res.json({ transactions: rows, byCategory: summary });
});

router.post("/mno/purge", ...superAdmin, async (_req, res) => {
  res.json({ purged: await purgeExpired(), retentionDays: RETENTION_DAYS });
});

export default router;
