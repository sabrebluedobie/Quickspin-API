// api/create.js
import OpenAI from "openai";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// CORS allow-list
const ALLOWED = new Set([
  "https://bluedobiedev.com",
  "https://www.bluedobiedev.com",
  "https://sabrebluedobie.github.io"
]);
function setCors(res, origin) {
  if (ALLOWED.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// helpers
function parseBody(req) {
  try {
    if (typeof req.body === "string") return JSON.parse(req.body || "{}");
    if (req.body && typeof req.body === "object") return req.body;
  } catch (_) {}
  return {};
}

function fallbackPayload({ business = "", offer = "", tone = "Friendly", platform = "Facebook", keywords = "" }) {
  const tag = (business || "local").replace(/\s+/g, "");
  return {
    mode: "fallback",
    posts: [
      {
        short: `Local ${business || "business"} — ${offer || "book today"}.`,
        medium: `Need ${business || "help"}? ${offer || "We keep it simple and affordable."}`,
        cta: "Book your free 30-minute consult → https://bluedobiedev.com/contact",
        hashtags: [`#${tag}`, "#SmallBusiness", "#Local"],
        image_prompt: `Clean, bright photo of ${business || "a local service"} at work`
      }
    ]
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  setCors(res, origin);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { business = "", offer = "", tone = "Friendly", platform = "Facebook", keywords = "" } = parseBody(req);

  // If no key, return stub so the app stays usable
  if (!client) {
    return res.status(200).json(fallbackPayload({ business, offer, tone, platform, keywords }));
  }

  try {
    const system = [
      "You write concise, brand-safe social posts for SMALL LOCAL BUSINESSES.",
      "Return JSON ONLY (no prose) with this shape:",
      `{
        "mode": "openai",
        "posts": [
          {
            "short": string,        // ≈100 chars, hooky
            "medium": string,       // ≈220 chars, tailored to platform
            "cta": string,          // one line with https://bluedobiedev.com/contact
            "hashtags": string[],   // 3–6 relevant tags (no giant blocks)
            "image_prompt": string  // 1 line descriptive visual idea
          },
          ...
        ]
      }`,
      "Guardrails: no medical/financial/legal claims; plain language; friendly, helpful tone.",
      "Make content platform-aware (e.g., don't stuff hashtags for Facebook).",
      "Make variants distinct, not rephrasings."
    ].join("\n");

    const user = [
      `Business: ${business || "Local service"}`,
      `Offer: ${offer || "General brand awareness"}`,
      `Tone: ${tone}`,
      `Platform: ${platform}`,
      `Keywords: ${keywords || "(none)"}`
    ].join("\n");

    // Ask for 3 variants, plenty of tokens
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
        { role: "user", content: "Produce 3 distinct posts in the JSON array." }
      ]
    });

    // Try to parse strict JSON from the response
    const raw = completion.choices?.[0]?.message?.content || "";
    let json = null;

    // Find the first {...} block to be safe if model adds stray text
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try { json = JSON.parse(raw.slice(start, end + 1)); } catch (_) {}
    }

    if (!json || !json.posts) {
      // If parsing fails, wrap raw text once so the UI still shows something
      return res.status(200).json({
        mode: "openai-raw",
        posts: [{ short: "", medium: raw.trim(), cta: "https://bluedobiedev.com/contact", hashtags: [], image_prompt: "" }]
      });
    }

    // Ensure mode is present
    json.mode = "openai";
    return res.status(200).json(json);

  } catch (err) {
    console.error("OpenAI error:", err?.message || err);
    return res.status(200).json(fallbackPayload({ business, offer, tone, platform, keywords }));
  }
}