import { db, scorecardsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { DEFAULT_WEIGHTS } from "./dimensions.js";

/**
 * The weights a score is actually built with. Whatever the super admin has
 * promoted to production for a segment is what scores and reports use — the
 * built-in defaults are only a fallback for a bureau with no scorecard live.
 */
export async function activeWeights(segment = "consumer"): Promise<Record<string, number>> {
  const [card] = await db.select().from(scorecardsTable)
    .where(and(
      eq(scorecardsTable.segment, segment as "consumer"),
      eq(scorecardsTable.status, "production"),
    )).limit(1);

  const weights = (card?.weights ?? {}) as Record<string, number>;
  const total = Object.values(weights).reduce((sum: number, v) => sum + Number(v), 0);
  return total > 0 ? weights : DEFAULT_WEIGHTS;
}
