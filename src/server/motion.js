import { Router } from "express";
import fs from "fs";
import path from "path";

export const motionRouter = Router();

const FAL_KEY = process.env.FAL_KEY;
const KLING_SUBMIT_URL = "https://queue.fal.run/fal-ai/kling-video/v2.1/standard/image-to-video";

function imageToDataUri(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).replace(".", "") || "png";
  return `data:image/${ext};base64,${buffer.toString("base64")}`;
}

async function pollForResult(statusUrl, responseUrl, maxWaitMs = 120000, intervalMs = 4000) {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    const statusJson = await statusRes.json();

    if (statusJson.status === "COMPLETED") {
      const resultRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      return await resultRes.json();
    }

    if (statusJson.status === "FAILED" || statusJson.status === "ERROR") {
      throw new Error(`fal.ai job failed: ${JSON.stringify(statusJson)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for motion video generation");
}

// POST /api/media/motion — turn a still image into a short video clip with real motion
motionRouter.post("/motion", async (req, res) => {
  try {
    if (!FAL_KEY) {
      return res.status(500).json({ error: "FAL_KEY is not set in .env" });
    }

    const { imageUrl, prompt } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    const publicDir = path.join(process.cwd(), "public");
    const imagePath = path.join(publicDir, imageUrl.replace(/^\//, ""));

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: `Image not found at ${imagePath}` });
    }

    const dataUri = imageToDataUri(imagePath);

    const submitRes = await fetch(KLING_SUBMIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: dataUri,
        prompt: prompt || "gentle natural movement, subtle realistic motion, cinematic",
      }),
    });

    const submitJson = await submitRes.json();

    if (!submitRes.ok) {
      console.error("fal.ai submit error:", submitJson);
      return res.status(500).json({ error: "Failed to submit motion job", details: submitJson });
    }

    console.log("fal.ai job submitted, polling for result...", submitJson.request_id);

    const result = await pollForResult(submitJson.status_url, submitJson.response_url);
    const motionVideoUrl = result.video?.url;

    if (!motionVideoUrl) {
      return res.status(500).json({ error: "No video URL in fal.ai response", details: result });
    }

    res.json({ motionVideoUrl });
  } catch (err) {
    console.error("Motion generation error:", err);
    res.status(500).json({ error: err.message || "Failed to generate motion video" });
  }
});