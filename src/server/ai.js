import { Router } from "express";
import OpenAI from "openai";

export const aiRouter = Router();

let openai;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return openai;
}

// Core logic — callable directly (no HTTP) or via the route below
export async function generateScript(niche, topic) {
  const prompt = `Write a short, engaging YouTube video script (under 400 words) for a faceless channel in the "${niche}" niche, about the topic: "${topic}". 
Structure it with a hook in the first line, then body content, then a short call-to-action ending. Return plain text only, no markdown formatting.`;

  const completion = await getOpenAI().chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content;
}

export async function generateMetadata(script, niche) {
  const prompt = `Based on this YouTube video script, generate SEO metadata for a "${niche || "general"}" niche channel.
Return ONLY valid JSON in this exact format, no extra text:
{"title": "...", "description": "...", "tags": ["tag1", "tag2", "tag3"]}

The title should be under 70 characters and attention-grabbing. The description should be 2-3 sentences summarizing the video and encouraging viewers to watch/subscribe. Include 5-8 relevant tags.

Script:
${script}`;

  const completion = await getOpenAI().chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content);
}

// POST /api/ai/script
aiRouter.post("/script", async (req, res) => {
  try {
    const { niche, topic } = req.body;
    if (!niche || !topic) {
      return res.status(400).json({ error: "niche and topic are required" });
    }
    const scriptText = await generateScript(niche, topic);
    res.json({ niche, topic, script: scriptText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate script" });
  }
});

// POST /api/ai/metadata
aiRouter.post("/metadata", async (req, res) => {
  try {
    const { script, niche } = req.body;
    if (!script) {
      return res.status(400).json({ error: "script is required" });
    }
    const metadata = await generateMetadata(script, niche);
    res.json(metadata);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate metadata" });
  }
});