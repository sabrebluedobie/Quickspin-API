// api/create.js
import OpenAI from "openai";

// 🔐 Add OPENAI_API_KEY in Vercel → Settings → Environment Variables
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Allow only your sites to call this API (CORS)
const ALLOWED_ORIGINS = [
  "https://sabrebluedobie.github.io",
  "https://bluedobiedev.com"
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // CORS preflight
  if (req.method === "OPTIONS") {
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    return res.status(204).end();
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { business, offer, tone = "Friendly", platform = "Facebook", keywords = "" } = req.body || {};
    if (!business) return res.status(400).json({ error: "Missing 'business' field." });

    const system = [
      "You write concise, brand-safe social posts for small local businesses.",
      "Output exactly this structure:",
      "[Short] (~100 chars max)",
      "[Medium] (~220 chars max, platform-aware)",
      "[CTA] (single line linking to https://bluedobiedev.com/contact)",
      "[Hashtags] (3–6 tags, simple, no spammy blocks)",
      "[Image Prompt] (one line suggestion)",
      "Guardrails: no medical/financial claims; plain language; local-service friendly."
    ].join("\n");

    const user = [
      `Business: ${business}`,
      `Offer: ${offer || "General brand awareness"}`,
      `Tone: ${tone}`,
      `Platform: ${platform}`,
      `Keywords: ${keywords}`
    ].join("\n");

    // 🔮 Call OpenAI (you can upgrade model later)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.7,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty response from model.");

    return res.status(200).json({ result: text });
  } catch (err) {
    console.error("QuickSpin error:", err?.message || err);
    return res.status(500).json({ error: "Generation failed. Try again in a moment." });
  }
}