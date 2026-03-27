import { Router, type IRouter } from "express";
import { db, customersTable, loansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { generateBankData, generateMnoData, generateMfiData } from "../lib/mock-integrations.js";

const router: IRouter = Router();

router.post("/bank/fetch", requireAuth, async (req, res) => {
  const { nrc } = req.body;
  if (!nrc) {
    res.status(400).json({ error: "Bad Request", message: "NRC required" });
    return;
  }
  res.json(generateBankData(nrc));
});

router.post("/mno/fetch", requireAuth, async (req, res) => {
  const { nrc } = req.body;
  if (!nrc) {
    res.status(400).json({ error: "Bad Request", message: "NRC required" });
    return;
  }
  res.json(generateMnoData(nrc));
});

router.post("/mfi/fetch", requireAuth, async (req, res) => {
  const { nrc } = req.body;
  if (!nrc) {
    res.status(400).json({ error: "Bad Request", message: "NRC required" });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, nrc));
  const loans = customer ? await db.select().from(loansTable).where(eq(loansTable.customerId, customer.id)) : [];
  res.json(generateMfiData(nrc, loans));
});

export default router;
