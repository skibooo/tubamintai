import { Router } from "express";
import cron from "node-cron";
import { prisma } from "./prisma.js";
import { requireAuth } from "./middleware.js";
import jwt from "jsonwebtoken";

export const automationRouter = Router();

// POST /api/automation/start — create a real automation cycle for a channel
automationRouter.post("/start", requireAuth, async (req, res) => {
  try {
    const { channelId, durationDays, autoRefresh } = req.body;

    if (!channelId || !durationDays) {
      return res.status(400).json({ error: "channelId and durationDays are required" });
    }

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, userId: req.user.id },
    });

    if (!channel) {
      return res.status(404).json({ error: "Channel not found for this user" });
    }

    const existingActiveCycle = await prisma.automationCycle.findFirst({
      where: { channelId, isActive: true },
    });

    if (existingActiveCycle) {
      return res.status(400).json({ error: "This channel already has an active automation cycle" });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Number(durationDays));

    const cycle = await prisma.automationCycle.create({
      data: {
        userId: req.user.id,
        channelId,
        durationDays: Number(durationDays),
        startDate,
        endDate,
        isActive: true,
        autoRefresh: Boolean(autoRefresh),
      },
    });

    console.log(`[Automation] Started ${durationDays}-day cycle (${cycle.id}) for channel ${channelId}`);

    res.json({ success: true, cycle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start automation cycle" });
  }
});

// GET /api/automation/cycles — list all automation cycles for the logged-in user
automationRouter.get("/cycles", requireAuth, async (req, res) => {
  try {
    const cycles = await prisma.automationCycle.findMany({
      where: { userId: req.user.id },
    });
    res.json(cycles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch automation cycles" });
  }
});

// TEMP debug route — manually trigger a pipeline run for testing (remove before production)
automationRouter.post("/test-run/:cycleId", requireAuth, async (req, res) => {
  try {
    const cycle = await prisma.automationCycle.findUnique({ where: { id: req.params.cycleId } });
    if (!cycle) return res.status(404).json({ error: "Cycle not found" });

    await runPipelineForCycle(cycle);
    res.json({ success: true, message: "Pipeline run triggered — check console logs and automation_jobs table" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Runs the full content pipeline for one automation cycle
async function runPipelineForCycle(cycle) {
  const job = await prisma.automationJob.create({
    data: {
      cycleId: cycle.id,
      userId: cycle.userId,
      channelId: cycle.channelId,
      status: "pending",
      currentStep: "starting",
    },
  });

  const BASE_URL = process.env.INTERNAL_API_URL || "http://127.0.0.1:3000";

  try {
    const channel = await prisma.channel.findUnique({ where: { id: cycle.channelId } });
    if (!channel) {
      throw new Error("Channel not found for this cycle");
    }

    const cycleUser = await prisma.user.findUnique({ where: { id: cycle.userId } });
    if (!cycleUser) {
      throw new Error("User not found for this cycle");
    }
    const internalToken = jwt.sign(
      { userId: cycleUser.id, tenantId: cycleUser.tenantId, role: cycleUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${internalToken}`,
    };

    // Step 1: Topic
    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "topic" } });
    const topicRes = await fetch(`${BASE_URL}/api/ai/script`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        niche: channel.niche,
        topic: `Generate ONE specific, narrow video topic idea within the "${channel.niche}" niche — something concrete and interesting, not a repeat of common obvious ideas. Reply with ONLY the topic itself, nothing else.`,
      }),
    });
    const topicData = await topicRes.json();
    if (!topicData.script) {
      throw new Error(`Topic generation failed: ${topicData.error || "no script returned"}`);
    }
    const generatedTopic = topicData.script;

    // Step 2: Script
    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "script" } });
    const scriptRes = await fetch(`${BASE_URL}/api/ai/script`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ niche: channel.niche, topic: generatedTopic }),
    });
    const scriptData = await scriptRes.json();
    if (!scriptData.script) {
      throw new Error(`Script generation failed: ${scriptData.error || "no script returned"}`);
    }
    const script = scriptData.script;

    // Step 3: Metadata
    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "metadata" } });
    const metaRes = await fetch(`${BASE_URL}/api/ai/metadata`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ script }),
    });
    const metadata = await metaRes.json();
    if (!metadata.title) {
      throw new Error(`Metadata generation failed: ${metadata.error || "no title returned"}`);
    }

    // Step 4: Voice
    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "voice" } });
    const voiceRes = await fetch(`${BASE_URL}/api/media/voice`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ text: script }),
    });
    const voiceData = await voiceRes.json();
    if (!voiceData.audioUrl) {
      throw new Error(`Voice generation failed: ${voiceData.error || "no audioUrl returned"}`);
    }
    const audioUrl = voiceData.audioUrl;
    const audioFileName = audioUrl.split("/").pop();

    // Step 5: Subtitles
    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "subtitles" } });
    const subRes = await fetch(`${BASE_URL}/api/media/subtitles`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ audioFileName }),
    });
    const subData = await subRes.json();
    if (!subData.url) {
      throw new Error(`Subtitle generation failed: ${subData.error || "no url returned"}`);
    }
    const srtUrl = subData.url;

    // Step 6: Images
    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "images" } });
    const imageUrls = [];
    for (let i = 0; i < 5; i++) {
      const imgRes = await fetch(`${BASE_URL}/api/media/image`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ prompt: `${channel.niche}, scene ${i + 1}, cinematic` }),
      });
      const imgData = await imgRes.json();

      if (imgData.imageUrl) {
        imageUrls.push(imgData.imageUrl);
      } else {
        console.error(`[Automation] Image ${i + 1} failed to generate:`, imgData.error || "unknown error");
      }
    }
    if (imageUrls.length === 0) {
      throw new Error("All image generations failed — cannot render video with zero images");
    }

    // Step 7: Render
    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "render" } });
    const renderRes = await fetch(`${BASE_URL}/api/media/render`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ audioUrl, imageUrls, srtUrl }),
    });
    const renderData = await renderRes.json();
    if (!renderData.videoUrl) {
      throw new Error(`Render failed: ${renderData.error || "no videoUrl returned"}`);
    }
    const videoUrl = renderData.videoUrl;

    // Step 8: Upload
    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "upload" } });
    const videoFileName = videoUrl.split("/").pop();

    const uploadRes = await fetch(`${BASE_URL}/api/youtube/upload`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        videoFileName,
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        privacyStatus: "public",
      }),
    });
    const uploadResult = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(`YouTube upload failed: ${uploadResult.error || "unknown error"}`);
    }

    await prisma.automationJob.update({
      where: { id: job.id },
      data: { status: "completed", currentStep: "done", logsJson: { videoUrl, metadata, uploadResult } },
    });

    console.log(`[Automation] Job ${job.id} completed for channel ${cycle.channelId}`);
  } catch (err) {
    console.error(`[Automation] Job ${job.id} failed:`, err.message);
    await prisma.automationJob.update({
      where: { id: job.id },
      data: { status: "failed", logsJson: { error: err.message } },
    });
  }
}

// Runs once a day — checks all active cycles and processes each one
function startAutomationScheduler() {
  cron.schedule("0 0 * * *", async () => {
    console.log("[Scheduler] Running daily automation check...");

    const now = new Date();

    const activeCycles = await prisma.automationCycle.findMany({
      where: { isActive: true, endDate: { gte: now } },
    });

    console.log(`[Scheduler] Found ${activeCycles.length} active cycle(s)`);

    for (const cycle of activeCycles) {
      await runPipelineForCycle(cycle);
    }

    const expiredCycles = await prisma.automationCycle.findMany({
      where: { isActive: true, endDate: { lt: now } },
    });

    for (const cycle of expiredCycles) {
      if (cycle.autoRefresh) {
        const newStartDate = new Date();
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + cycle.durationDays);

        await prisma.automationCycle.update({
          where: { id: cycle.id },
          data: { startDate: newStartDate, endDate: newEndDate },
        });

        console.log(`[Scheduler] Auto-refreshed cycle ${cycle.id}`);
      } else {
        await prisma.automationCycle.update({
          where: { id: cycle.id },
          data: { isActive: false },
        });

        console.log(`[Scheduler] Cycle ${cycle.id} ended (no auto-refresh)`);
      }
    }
  });

  console.log("[Scheduler] Automation scheduler started (runs daily at midnight)");
}

startAutomationScheduler();