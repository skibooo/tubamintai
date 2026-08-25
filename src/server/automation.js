import { Router } from "express";
import cron from "node-cron";
import { prisma } from "./prisma.js";
import { requireAuth } from "./middleware.js";
import { generateScript, generateMetadata } from "./ai.js";
import { generateVoice, generateSubtitlesForAudio, generateImage, renderVideo } from "./media.js";
import { uploadVideoForUser } from "./youtube.js";

export const automationRouter = Router();

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

automationRouter.get("/cycles", requireAuth, async (req, res) => {
  try {
    const cycles = await prisma.automationCycle.findMany({ where: { userId: req.user.id } });
    res.json(cycles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch automation cycles" });
  }
});

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

// Runs the full content pipeline — now direct function calls, no HTTP self-calls
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

  try {
    const channel = await prisma.channel.findUnique({ where: { id: cycle.channelId } });
    if (!channel) throw new Error("Channel not found for this cycle");

    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "topic" } });
    const generatedTopic = await generateScript(
      channel.niche,
      `Generate ONE specific, narrow video topic idea within the "${channel.niche}" niche — something concrete and interesting, not a repeat of common obvious ideas. Reply with ONLY the topic itself, nothing else.`
    );

    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "script" } });
    const script = await generateScript(channel.niche, generatedTopic);

    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "metadata" } });
    const metadata = await generateMetadata(script, channel.niche);
    if (!metadata.title) throw new Error("Metadata generation returned no title");

    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "voice" } });
    const audioUrl = await generateVoice(script);
    const audioFileName = audioUrl.split("/").pop();

    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "subtitles" } });
    const srtUrl = await generateSubtitlesForAudio(audioFileName);

    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "images" } });
    const imageUrls = [];
    for (let i = 0; i < 5; i++) {
      try {
        const imageUrl = await generateImage(`${channel.niche}, scene ${i + 1}, cinematic`);
        imageUrls.push(imageUrl);
      } catch (imgErr) {
        console.error(`[Automation] Image ${i + 1} failed:`, imgErr.message);
      }
    }
    if (imageUrls.length === 0) throw new Error("All image generations failed — cannot render video");

    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "render" } });
    const renderResult = await renderVideo({ audioUrl, imageUrls, srtUrl });
    if (!renderResult.videoUrl) throw new Error("Render failed — no videoUrl returned");
    const videoUrl = renderResult.videoUrl;

    await prisma.automationJob.update({ where: { id: job.id }, data: { currentStep: "upload" } });
    const videoFileName = videoUrl.split("/").pop();
    const uploadResult = await uploadVideoForUser({
      userId: cycle.userId,
      videoFileName,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      privacyStatus: "public",
    });

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
        await prisma.automationCycle.update({ where: { id: cycle.id }, data: { isActive: false } });
        console.log(`[Scheduler] Cycle ${cycle.id} ended (no auto-refresh)`);
      }
    }
  });

  console.log("[Scheduler] Automation scheduler started (runs daily at midnight)");
}

startAutomationScheduler();