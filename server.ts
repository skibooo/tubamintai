import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { aiRouter } from "./src/server/ai.js";
import { channelsRouter } from "./src/server/channels.js";
import { authRouter } from "./src/server/auth.js";
import { uniquenessRouter } from "./src/server/uniqueness.js";
import { youtubeRouter } from "./src/server/youtube.js";
import { paymentsRouter } from "./src/server/payments.js";
import { blogRouter } from "./src/server/blog.js";
import { agentRouter } from "./src/server/agent.js";
import { intelligenceRouter } from "./src/server/intelligence.js";
import { mediaRouter } from "./src/server/media.js";
import { googleAuthRouter } from "./src/server/googleAuth.js";
import { requireAuth } from "./src/server/middleware.js";
import { automationRouter } from "./src/server/automation.js";

import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const prisma = new PrismaClient();

// ==========================================
// CORS
// ==========================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://tubamintai-2399-dusky.vercel.app",
    ],
    credentials: true,
  })
);

// ==========================================
// BODY PARSING
// ==========================================

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// ==========================================
// MULTI-TENANT & RBAC MIDDLEWARE
// ==========================================

const checkSubscriptionLimits = (req: any, res: any, next: any) => {
  const { role, activeCycleExpiresAt } = req.user;

  if (role === "OWNER") return next();

  if (new Date() > new Date(activeCycleExpiresAt)) {
    return res
      .status(403)
      .json({ error: "Subscription cycle expired. Please renew." });
  }

  next();
};

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "YOUTUBAMINTAI API",
  });
});

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRouter);
app.use("/api/uniqueness", requireAuth, uniquenessRouter);
app.use(
  "/api/youtube",
  requireAuth,
  checkSubscriptionLimits,
  youtubeRouter
);
app.use("/api/blog", blogRouter);
app.use("/api/agent", requireAuth, agentRouter);
app.use("/api/intelligence", requireAuth, intelligenceRouter);
app.use("/api/channels", requireAuth, channelsRouter);
app.use("/api/ai", requireAuth, aiRouter);
app.use("/api/media", requireAuth, mediaRouter);

app.use("/audio", express.static("public/audio"));
app.use("/images", express.static("public/images"));
app.use("/videos", express.static("public/videos"));

app.use("/api/auth", googleAuthRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/automation", automationRouter);

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] YOUTUBAMINTAI API running on port ${PORT}`);
});