import { Router } from "express";
import crypto from "crypto";
import { prisma } from "./prisma.js";
import { requireAuth } from "./middleware.js";

export const paymentsRouter = Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Placeholder pricing — adjust these anytime
const TIER_PRICING = {
  Tier1_30: { amountNaira: 15000, durationDays: 30 },
  Tier2_60: { amountNaira: 25000, durationDays: 60 },
  Tier3_90: { amountNaira: 35000, durationDays: 90 },
  Tier4_365: { amountNaira: 120000, durationDays: 365 },
};

// POST /api/payments/initiate — start a payment for a plan tier
paymentsRouter.post("/initiate", requireAuth, async (req, res) => {
  try {
    const { tier } = req.body;

    if (!tier || !TIER_PRICING[tier]) {
      return res.status(400).json({ error: `tier must be one of: ${Object.keys(TIER_PRICING).join(", ")}` });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const { amountNaira } = TIER_PRICING[tier];

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountNaira * 100, // Paystack expects kobo
        metadata: { userId: user.id, tier },
        callback_url: "http://localhost:5173/payment-success",
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      console.error("Paystack init failed:", paystackData);
      return res.status(500).json({ error: "Failed to initialize payment" });
    }

    res.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// POST /api/payments/webhook — Paystack calls this on payment events
// NOTE: must be mounted with express.raw() body parsing for signature verification to work
paymentsRouter.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    const expectedSignature = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("[Paystack Webhook] Invalid signature — rejecting");
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === "charge.success") {
      const { userId, tier } = event.data.metadata;
      const { durationDays } = TIER_PRICING[tier];

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + durationDays);

      await prisma.user.update({
        where: { id: userId },
        data: { planTier: tier, activeCycleExpiresAt: newExpiry },
      });

      console.log(`[Paystack] Payment confirmed — user ${userId} upgraded to ${tier}, expires ${newExpiry.toISOString()}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("[Paystack Webhook] Error:", err);
    res.sendStatus(500);
  }
});

// GET /api/payments/verify/:reference — confirm a payment directly (works even without a public webhook URL)
paymentsRouter.get("/verify/:reference", requireAuth, async (req, res) => {
  try {
    const { reference } = req.params;

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      return res.status(400).json({ error: "Payment not successful" });
    }

    const { userId, tier } = verifyData.data.metadata;
    const { durationDays } = TIER_PRICING[tier];

    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + durationDays);

    await prisma.user.update({
      where: { id: userId },
      data: { planTier: tier, activeCycleExpiresAt: newExpiry },
    });

    console.log(`[Paystack] Verified via redirect — user ${userId} upgraded to ${tier}, expires ${newExpiry.toISOString()}`);

    res.json({ success: true, tier, expiresAt: newExpiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});