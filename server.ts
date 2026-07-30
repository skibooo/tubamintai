import express from "express";
import path from "path";
import cors from "cors";
import cron from "node-cron";
import dotenv from "dotenv";

import { authRouter } from "./src/server/auth.js";
import { uniquenessRouter } from "./src/server/uniqueness.js";
import { youtubeRouter } from "./src/server/youtube.js";
import { paymentsRouter } from "./src/server/payments.js";
import { blogRouter } from "./src/server/blog.js";
import { agentRouter } from "./src/server/agent.js";
import { intelligenceRouter } from "./src/server/intelligence.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. MULTI-TENANT & RBAC MIDDLEWARE
// ==========================================
const requireAuth = (req: any, res: any, next: any) => {
  req.user = {
    id: "mock-user-id",
    tenantId: "mock-tenant-id",
    role: req.headers["x-user-role"] || "PUBLIC",
    activeCycleExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
  next();
};

const checkSubscriptionLimits = (req: any, res: any, next: any) => {
  const { role, activeCycleExpiresAt } = req.user;
  if (role === "OWNER") return next();
  if (new Date() > new Date(activeCycleExpiresAt)) {
    return res.status(403).json({ error: "Subscription cycle expired. Please renew." });
  }
  next();
};

// ==========================================
// ROUTES
// ==========================================
app.use("/api/auth", authRouter);
app.use("/api/uniqueness", requireAuth, uniquenessRouter);
app.use("/api/youtube", requireAuth, checkSubscriptionLimits, youtubeRouter);
app.use("/api/payments", requireAuth, paymentsRouter);
app.use("/api/blog", blogRouter);
app.use("/api/agent", requireAuth, agentRouter);
app.use("/api/intelligence", requireAuth, intelligenceRouter);

// ==========================================
// AUTOMATION CYCLES (30/60/90/365)
// ==========================================
app.post("/api/automation/start", requireAuth, async (req, res) => {
  const { cycleDurationDays, autoRefresh } = req.body;
  console.log(`[Automation] Started ${cycleDurationDays}-day cycle for tenant ${req.user.tenantId}`);
  res.json({ success: true, cycleDurationDays, autoRefresh });
});

// ==========================================
// CRON SCHEDULER (Daily Uploads & Cycle Refresh)
// ==========================================
cron.schedule("0 0 * * *", async () => {
  console.log("[Scheduler] Running daily checks for automation cycles...");
});

// ==========================================
// VITE MIDDLEWARE (Production Ready)
// ==========================================
if (process.env.NODE_ENV !== "production") {
  import("vite").then(async (vite) => {
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(viteServer.middlewares);
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] YOUTUBAMINTAI API running on port ${PORT}`);
});
