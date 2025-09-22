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
  if (ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (origin && origin.includes('localhost')) {
    // Allow localhost for development
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// helpers
function parseBody(req) {
  try {
    if (typeof req.body === "string") {
      return JSON.parse(req.body || "{}");
    }
    if (req.body && typeof req.body === "object") {
      return req.body;
    }
  } catch (e) {
    console.error("Body parse error:", e);
  }
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

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { 
    business = "", 
    offer = "", 
    tone = "Friendly", 
    platform = "Facebook", 
    keywords = "" 
  } = parseBody(req);

  // If no key, return stub so the app stays usable
  if (!client) {
    console.warn("No OpenAI API key found, using fallback");
    return res.status(200).json(fallbackPayload({ business, offer, tone, platform, keywords }));
  }

  try {
    const system = [
      "You write concise, brand-safe social posts for SMALL LOCAL BUSINESSES.",
      "Return JSON ONLY (no prose, no markdown code blocks) with this exact shape:",
      `{
        "posts": [
          {
            "short": "string (≈100 chars, hooky)",
            "medium": "string (≈220 chars, tailored to platform)",
            "cta": "string (one line with https://bluedobiedev.com/contact)",
            "hashtags": ["array", "of", "3-6", "tags"],
            "image_prompt": "string (1 line descriptive visual idea)"
          }
        ]
      }`,
      "Guardrails: no medical/financial/legal claims; plain language; friendly, helpful tone.",
      "Make content platform-aware (e.g., don't stuff hashtags for Facebook).",
      "Make variants distinct, not rephrasings.",
      "IMPORTANT: Return ONLY valid JSON, no other text."
    ].join("\n");

    const user = [
      `Business: ${business || "Local service"}`,
      `Offer: ${offer || "General brand awareness"}`,
      `Tone: ${tone}`,
      `Platform: ${platform}`,
      `Keywords: ${keywords || "(none)"}`
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 800,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
        { role: "user", content: "Produce 3 distinct posts in the JSON array." }
      ],
      response_format: { type: "json_object" } // Force JSON response
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    
    // Clean potential markdown code blocks
    let cleanedRaw = raw.trim();
    if (cleanedRaw.startsWith('```json')) {
      cleanedRaw = cleanedRaw.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedRaw.startsWith('```')) {
      cleanedRaw = cleanedRaw.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    let json = null;
    try {
      json = JSON.parse(cleanedRaw);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw response:", raw);
      
      // Try to extract JSON from the response
      const start = cleanedRaw.indexOf("{");
      const end = cleanedRaw.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        try {
          json = JSON.parse(cleanedRaw.slice(start, end + 1));
        } catch (innerError) {
          console.error("Failed to extract JSON:", innerError);
        }
      }
    }

    if (!json || !json.posts || !Array.isArray(json.posts) || json.posts.length === 0) {
      console.warn("Invalid JSON structure, using fallback");
      return res.status(200).json(fallbackPayload({ business, offer, tone, platform, keywords }));
    }

    // Ensure mode is present
    json.mode = "openai";
    return res.status(200).json(json);

  } catch (err) {
    console.error("OpenAI error:", err?.message || err);
    return res.status(200).json(fallbackPayload({ business, offer, tone, platform, keywords }));
  }
}