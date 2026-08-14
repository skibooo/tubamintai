import { Router } from "express";
import { prisma } from "./prisma.js";

export const channelsRouter = Router();

// GET /api/channels — list the logged-in user's channels
channelsRouter.get("/", async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({
      where: { userId: req.user.id },
    });
    res.json(channels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// POST /api/channels — register a new channel profile
channelsRouter.post("/", async (req, res) => {
  try {
    const { title, niche, youtubeChannelId } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Channel title is required" });
    }

    const channel = await prisma.channel.create({
      data: {
        userId: req.user.id,
        title,
        niche: niche || null,
        youtubeChannelId: youtubeChannelId || null,
      },
    });

    res.status(201).json(channel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create channel" });
  }
});