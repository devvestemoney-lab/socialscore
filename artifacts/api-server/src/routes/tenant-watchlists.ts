import { Router, type IRouter } from "express";
import {
  db, watchlistsTable, watchlistMembersTable, customersTable, tenantsTable,
  usersTable, insertWatchlistSchema,
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;

const CADENCE_DAYS: Record<string, number> = { daily: 1, weekly: 7, fortnightly: 14, monthly: 30, quarterly: 90 };
const nextReview = (cadence: string) => new Date(Date.now() + (CADENCE_DAYS[cadence] ?? 7) * 86_400_000);

/** Member rows enriched with live bureau + book position */
function memberRowsSql(watchlistId: string, institution: string) {
  return sql`
    select m.id, m.reason, m.source, m.added_by, m.created_at, m.review_note,
           c.id as customer_id, c.first_name, c.last_name, c.nrc, c.province,
           (select round(cs.score)::int from credit_scores cs where cs.customer_id = c.id order by cs.created_at desc limit 1) as score,
           coalesce((select sum(l.outstanding_balance) from loans l where l.customer_id = c.id and l.institution = ${institution} and l.status != 'closed'), 0)::float as exposure,
           coalesce((select sum(l.missed_payments) from loans l where l.customer_id = c.id and l.institution = ${institution}), 0)::int as missed,
           coalesce((select count(*) from loans l where l.customer_id = c.id and l.status in ('defaulted','written_off')), 0)::int as bureau_defaults
    from watchlist_members m
    join customers c on c.id = m.customer_id
    where m.watchlist_id = ${watchlistId}
    order by exposure desc, m.created_at desc`;
}

/** List watchlists with live member counts and aggregate exposure */
router.get("/watchlists", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  const institution = tenant?.name ?? "";

  const rows = (await db.execute(sql`
    select w.*,
      (select count(*) from watchlist_members m where m.watchlist_id = w.id)::int as members,
      coalesce((select sum(l.outstanding_balance) from watchlist_members m
        join loans l on l.customer_id = m.customer_id
        where m.watchlist_id = w.id and l.institution = ${institution} and l.status != 'closed'), 0)::float as exposure,
      coalesce((select count(*) from watchlist_members m
        join loans l on l.customer_id = m.customer_id
        where m.watchlist_id = w.id and l.institution = ${institution} and l.missed_payments > 0), 0)::int as flagged
    from watchlists w where w.tenant_id = ${tenantId}
    order by case w.priority when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end, w.created_at desc
  `)).rows as any[];

  const recent = (await db.execute(sql`
    select m.id, m.reason, m.source, m.created_at, w.name as watchlist_name, w.id as watchlist_id,
           c.first_name, c.last_name, c.id as customer_id
    from watchlist_members m
    join watchlists w on w.id = m.watchlist_id
    join customers c on c.id = m.customer_id
    where w.tenant_id = ${tenantId}
    order by m.created_at desc limit 8
  `)).rows;

  const totals = {
    lists: rows.length,
    activeLists: rows.filter(r => r.active).length,
    members: rows.reduce((a, r) => a + r.members, 0),
    exposure: rows.reduce((a, r) => a + r.exposure, 0),
    flagged: rows.reduce((a, r) => a + r.flagged, 0),
    dueForReview: rows.filter(r => r.next_review_at && new Date(r.next_review_at) <= new Date()).length,
  };

  res.json({ watchlists: rows, recent, totals, institution });
});

/** Watchlist detail with enriched members */
router.get("/watchlists/:id", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [watchlist] = await db.select().from(watchlistsTable)
    .where(and(eq(watchlistsTable.id, req.params.id), eq(watchlistsTable.tenantId, tenantId ?? "")));
  if (!watchlist) { res.status(404).json({ error: "Not Found", message: "Watchlist not found" }); return; }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId ?? ""));
  const members = (await db.execute(memberRowsSql(watchlist.id, tenant?.name ?? ""))).rows;
  res.json({ watchlist, members });
});

router.post("/watchlists", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const parsed = insertWatchlistSchema.omit({ tenantId: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }
  const [watchlist] = await db.insert(watchlistsTable).values({
    ...parsed.data,
    tenantId,
    createdBy: user?.name ?? "",
    owner: parsed.data.owner || user?.name || "",
    nextReviewAt: nextReview(parsed.data.reviewCadence ?? "weekly"),
  }).returning();

  // Auto-enrol from the tenant's book when criteria are supplied
  let enrolled = 0;
  if (watchlist.autoEnrol) {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    const c = watchlist.criteria ?? {};
    const matches = (await db.execute(sql`
      with book as (
        select cu.id,
          (select round(cs.score)::int from credit_scores cs where cs.customer_id = cu.id order by cs.created_at desc limit 1) as score,
          coalesce(sum(l.outstanding_balance) filter (where l.status != 'closed'), 0)::float as exposure,
          coalesce(sum(l.missed_payments), 0)::int as missed
        from customers cu
        join loans l on l.customer_id = cu.id and l.institution = ${tenant?.name ?? ""}
        group by cu.id
      )
      select id from book where true
        ${c.maxScore != null ? sql`and score is not null and score <= ${c.maxScore}` : sql``}
        ${c.minScore != null ? sql`and score is not null and score >= ${c.minScore}` : sql``}
        ${c.minMissedPayments != null ? sql`and missed >= ${c.minMissedPayments}` : sql``}
        ${c.minExposure != null ? sql`and exposure >= ${c.minExposure}` : sql``}
      limit 200`)).rows as any[];
    if (matches.length) {
      await db.insert(watchlistMembersTable).values(matches.map(m => ({
        watchlistId: watchlist.id, customerId: m.id, source: "auto" as const,
        reason: "Auto-enrolled — matched watchlist criteria", addedBy: "System",
      })));
      enrolled = matches.length;
    }
  }
  res.status(201).json({ watchlist, enrolled });
});

router.put("/watchlists/:id", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const parsed = insertWatchlistSchema.omit({ tenantId: true }).partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }
  const [watchlist] = await db.update(watchlistsTable)
    .set({
      ...parsed.data,
      ...(parsed.data.reviewCadence ? { nextReviewAt: nextReview(parsed.data.reviewCadence) } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(watchlistsTable.id, req.params.id), eq(watchlistsTable.tenantId, tenantId ?? "")))
    .returning();
  if (!watchlist) { res.status(404).json({ error: "Not Found", message: "Watchlist not found" }); return; }
  res.json({ watchlist });
});

router.delete("/watchlists/:id", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [deleted] = await db.delete(watchlistsTable)
    .where(and(eq(watchlistsTable.id, req.params.id), eq(watchlistsTable.tenantId, tenantId ?? "")))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not Found", message: "Watchlist not found" }); return; }
  res.json({ success: true });
});

/** Mark a review complete — rolls the next review date forward */
router.post("/watchlists/:id/review", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [current] = await db.select().from(watchlistsTable)
    .where(and(eq(watchlistsTable.id, req.params.id), eq(watchlistsTable.tenantId, tenantId ?? "")));
  if (!current) { res.status(404).json({ error: "Not Found", message: "Watchlist not found" }); return; }
  const [watchlist] = await db.update(watchlistsTable)
    .set({ nextReviewAt: nextReview(current.reviewCadence), updatedAt: new Date() })
    .where(eq(watchlistsTable.id, current.id)).returning();
  res.json({ watchlist });
});

router.post("/watchlists/:id/members", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [watchlist] = await db.select().from(watchlistsTable)
    .where(and(eq(watchlistsTable.id, req.params.id), eq(watchlistsTable.tenantId, tenantId ?? "")));
  if (!watchlist) { res.status(404).json({ error: "Not Found", message: "Watchlist not found" }); return; }
  const nrc = String(req.body?.nrc ?? "").trim();
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, nrc));
  if (!customer) { res.status(404).json({ error: "Not Found", message: `No consumer on file for "${nrc}"` }); return; }
  const [existing] = await db.select().from(watchlistMembersTable)
    .where(and(eq(watchlistMembersTable.watchlistId, watchlist.id), eq(watchlistMembersTable.customerId, customer.id)));
  if (existing) { res.status(409).json({ error: "Conflict", message: "Consumer is already on this watchlist" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [member] = await db.insert(watchlistMembersTable).values({
    watchlistId: watchlist.id, customerId: customer.id,
    reason: String(req.body?.reason ?? "Added manually"), addedBy: user?.name ?? "",
  }).returning();
  res.status(201).json({ member, consumer: `${customer.firstName} ${customer.lastName}` });
});

router.delete("/watchlists/:id/members/:memberId", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [watchlist] = await db.select().from(watchlistsTable)
    .where(and(eq(watchlistsTable.id, req.params.id), eq(watchlistsTable.tenantId, tenantId ?? "")));
  if (!watchlist) { res.status(404).json({ error: "Not Found", message: "Watchlist not found" }); return; }
  await db.delete(watchlistMembersTable).where(eq(watchlistMembersTable.id, req.params.memberId));
  res.json({ success: true });
});

export default router;
