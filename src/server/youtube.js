import { Router } from "express";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { prisma } from "./prisma.js";
import { requireAuth } from "./middleware.js";

export const youtubeRouter = Router();

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getFreshOAuthClient(userId) {
  const tokenRecord = await prisma.oAuthToken.findUnique({
    where: { userId_provider: { userId, provider: "youtube" } },
  });

  if (!tokenRecord) {
    throw new Error("No YouTube account connected for this user. Connect it first via /api/auth/google.");
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expiry_date: tokenRecord.expiresAt ? new Date(tokenRecord.expiresAt).getTime() : null,
  });

  const isExpired = !tokenRecord.expiresAt || new Date(tokenRecord.expiresAt).getTime() < Date.now() + 60000;

  if (isExpired) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    await prisma.oAuthToken.update({
      where: { userId_provider: { userId, provider: "youtube" } },
      data: {
        accessToken: credentials.access_token,
        expiresAt: new Date(credentials.expiry_date),
        refreshToken: credentials.refresh_token || tokenRecord.refreshToken,
      },
    });
  }

  return oauth2Client;
}

// Core logic — callable directly with a userId (no req/res needed)
export async function uploadVideoForUser({ userId, videoFileName, title, description, tags, privacyStatus }) {
  const videoPath = path.join(process.cwd(), "public", "videos", videoFileName);

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found at ${videoPath}`);
  }

  const auth = await getFreshOAuthClient(userId);
  const youtube = google.youtube({ version: "v3", auth });

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: { title, description: description || "", tags: tags || [] },
      status: { privacyStatus: privacyStatus || "private" },
    },
    media: { body: fs.createReadStream(videoPath) },
  });

  return {
    success: true,
    youtubeVideoId: response.data.id,
    url: `https://www.youtube.com/watch?v=${response.data.id}`,
  };
}

youtubeRouter.post("/upload", requireAuth, async (req, res) => {
  try {
    const { videoFileName, title, description, tags, privacyStatus } = req.body;
    if (!videoFileName || !title) {
      return res.status(400).json({ error: "videoFileName and title are required" });
    }
    const result = await uploadVideoForUser({
      userId: req.user.id, videoFileName, title, description, tags, privacyStatus,
    });
    res.json(result);
  } catch (err) {
    console.error("YouTube upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

youtubeRouter.get("/status/:videoId", requireAuth, async (req, res) => {
  try {
    const auth = await getFreshOAuthClient(req.user.id);
    const youtube = google.youtube({ version: "v3", auth });

    const response = await youtube.videos.list({
      part: ["status", "processingDetails"],
      id: [req.params.videoId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json(response.data.items[0]);
  } catch (err) {
    console.error("YouTube status check error:", err);
    res.status(500).json({ error: err.message || "Status check failed" });
  }
});