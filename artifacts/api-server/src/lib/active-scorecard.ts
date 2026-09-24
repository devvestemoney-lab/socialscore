import { db, scorecardsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { DEFAULT_WEIGHTS, DIMENSIONS } from "./dimensions.js";
import { logger } from "./logger.js";

const warned = new Set<string>();

/**
 * The scorecard a score is actually built with. Whatever the super admin has
 * promoted to production for a segment is what scores and reports use. A card
 * that doesn't weight every current dimension predates the model — using it
 * would silently zero the dimensions it leaves out — so the built-in defaults
 * are used until a card covering all of them is promoted.
 */
export async function activeScorecard(segment = "consumer"): Promise<{ weights: Record<string, number>; version: string }> {
  const [card] = await db.select().from(scorecardsTable)
    .where(and(
      eq(scorecardsTable.segment, segment as "consumer"),
      eq(scorecardsTable.status, "production"),
    )).limit(1);

  const weights = (card?.weights ?? {}) as Record<string, number>;
  const missing = DIMENSIONS.filter(d => weights[d.key] == null).map(d => d.key);
  if (!card || missing.length > 0) {
    if (card && !warned.has(card.id)) {
      warned.add(card.id);
      logger.warn({ scorecard: `${card.name} ${card.version}`, missing }, "production scorecard does not weight every dimension; using defaults");
    }
    return { weights: DEFAULT_WEIGHTS, version: "Default weights" };
  }
  const known = Object.fromEntries(DIMENSIONS.map(d => [d.key, Number(weights[d.key])]));
  return { weights: known, version: `${card.name} ${card.version}` };
}

export async function activeWeights(segment = "consumer"): Promise<Record<string, number>> {
  return (await activeScorecard(segment)).weights;
}
