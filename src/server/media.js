import { Router } from "express";
import { EdgeTTS } from "@andresaya/edge-tts";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import ffmpeg from "fluent-ffmpeg";

const execFileAsync = promisify(execFile);

export const mediaRouter = Router();

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
const SUBTITLES_DIR = path.join(process.cwd(), "public", "subtitles");

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
if (!fs.existsSync(SUBTITLES_DIR)) fs.mkdirSync(SUBTITLES_DIR, { recursive: true });

// --- Core logic, callable directly ---

export async function generateVoice(text, voice) {
  const tts = new EdgeTTS();
  await tts.synthesize(text, voice || "en-US-GuyNeural");

  const filename = `${randomUUID()}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);
  await tts.toFile(filepath.replace(".mp3", ""));

  return `/audio/${filename}`;
}

function runWhisperSubtitles(audioPath, outputSrtPath) {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(process.cwd(), "whisper-env", "Scripts", "python.exe");
    const scriptPath = path.join(process.cwd(), "src", "server", "subtitle.py");
    const proc = spawn(pythonPath, [scriptPath, audioPath, outputSrtPath]);

    let errorOutput = "";
    proc.stderr.on("data", (data) => { errorOutput += data.toString(); });

    proc.on("close", (code) => {
      if (code === 0) resolve(outputSrtPath);
      else reject(new Error(`Subtitle generation failed: ${errorOutput}`));
    });
  });
}

export async function generateSubtitlesForAudio(audioFileName) {
  const audioPath = path.join(AUDIO_DIR, audioFileName);
  const srtFileName = audioFileName.replace(".mp3", ".srt");
  const outputSrtPath = path.join(SUBTITLES_DIR, srtFileName);

  await runWhisperSubtitles(audioPath, outputSrtPath);

  return `/subtitles/${srtFileName}`;
}

export async function generateImage(prompt) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }
  );

  const result = await response.json();
  if (!result.success) {
    console.error(result.errors);
    throw new Error("Failed to generate image");
  }

  const base64Image = result.result.image;
  const filename = `${randomUUID()}.png`;
  const filepath = path.join(process.cwd(), "public", "images", filename);

  if (!fs.existsSync(path.dirname(filepath))) fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, Buffer.from(base64Image, "base64"));

  return `/images/${filename}`;
}

function getAudioDuration(filepath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

function chunkTextIntoCaptions(text, maxWordsPerCaption = 5) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWordsPerCaption) {
    chunks.push(words.slice(i, i + maxWordsPerCaption).join(" "));
  }
  return chunks;
}

function formatSrtTimestamp(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

function buildSrtContentEvenSplit(scriptText, totalDuration) {
  const sentences = chunkTextIntoCaptions(scriptText);
  const perSentenceDuration = totalDuration / sentences.length;
  let srt = "";
  sentences.forEach((sentence, i) => {
    const start = i * perSentenceDuration;
    const end = (i + 1) * perSentenceDuration;
    srt += `${i + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${sentence}\n\n`;
  });
  return srt;
}

function escapePathForFfmpegFilter(filePath) {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

export async function renderVideo({ audioUrl, imageUrls, scriptText, srtUrl }) {
  const videosDir = path.join(process.cwd(), "public", "videos");
  let concatFilePath;
  let fallbackSrtFilePath;

  try {
    if (!audioUrl || !imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error("audioUrl and a non-empty imageUrls array are required");
    }

    const publicDir = path.join(process.cwd(), "public");
    const audioPath = path.join(publicDir, audioUrl.replace(/^\//, ""));
    const imagePaths = imageUrls.map((url) => path.join(publicDir, url.replace(/^\//, "")));

    const duration = await getAudioDuration(audioPath);
    const perImageDuration = duration / imagePaths.length;

    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

    concatFilePath = path.join(videosDir, `${randomUUID()}-concat.txt`);
    let concatContent = "";
    for (const imgPath of imagePaths) {
      concatContent += `file '${imgPath.replace(/\\/g, "/")}'\nduration ${perImageDuration}\n`;
    }
    concatContent += `file '${imagePaths[imagePaths.length - 1].replace(/\\/g, "/")}'\n`;
    fs.writeFileSync(concatFilePath, concatContent);

    let videoFilter = "fps=25,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2";
    let srtPathToUse = null;

    if (srtUrl) {
      srtPathToUse = path.join(publicDir, srtUrl.replace(/^\//, ""));
    } else if (scriptText) {
      fallbackSrtFilePath = path.join(videosDir, `${randomUUID()}-subs.srt`);
      fs.writeFileSync(fallbackSrtFilePath, buildSrtContentEvenSplit(scriptText, duration));
      srtPathToUse = fallbackSrtFilePath;
    }

    if (srtPathToUse) {
      const escapedSrtPath = escapePathForFfmpegFilter(srtPathToUse);
      const subtitleStyle =
        "FontName=Montserrat,FontSize=15,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=80";
      videoFilter += `,subtitles='${escapedSrtPath}':original_size=1080x1920:force_style='${subtitleStyle}'`;
    }

    const outputFilename = `${randomUUID()}.mp4`;
    const outputPath = path.join(videosDir, outputFilename);

    await execFileAsync("ffmpeg", [
      "-f", "concat", "-safe", "0", "-i", concatFilePath, "-i", audioPath,
      "-vf", videoFilter, "-r", "25", "-fps_mode", "cfr",
      "-c:v", "libx264", "-c:a", "aac", "-shortest", "-y", outputPath,
    ]);

    return {
      videoUrl: `/videos/${outputFilename}`,
      subtitlesAdded: Boolean(srtPathToUse),
      subtitleSource: srtUrl ? "whisper" : (scriptText ? "even-split-fallback" : "none"),
    };
  } finally {
    if (concatFilePath && fs.existsSync(concatFilePath)) fs.unlinkSync(concatFilePath);
    if (fallbackSrtFilePath && fs.existsSync(fallbackSrtFilePath)) fs.unlinkSync(fallbackSrtFilePath);
  }
}

// --- Routes (thin wrappers) ---

mediaRouter.post("/voice", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    const audioUrl = await generateVoice(text, voice);
    res.json({ audioUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate voiceover" });
  }
});

mediaRouter.post("/subtitles", async (req, res) => {
  try {
    const { audioFileName } = req.body;
    if (!audioFileName) return res.status(400).json({ error: "audioFileName is required" });
    const url = await generateSubtitlesForAudio(audioFileName);
    res.json({ success: true, url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

mediaRouter.post("/image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const imageUrl = await generateImage(prompt);
    res.json({ imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

mediaRouter.post("/render", async (req, res) => {
  try {
    const result = await renderVideo(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to render video" });
  }
});