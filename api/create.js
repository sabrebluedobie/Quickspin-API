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

function parseBody(req) {
  try {
    if (typeof req.body === "string") return JSON.parse(req.body || "{}");
    if (req.body && typeof req.body === "object") return req.body;
  } catch (_) {}
  return {};
}

function stubResult({ business = "", offer = "", tone = "Friendly", platform = "Facebook", keywords = "" }) {
  return `[Short]
Local ${business || "business"} — ${offer || "book today"}.

[Medium]
${tone} ${platform} post with keywords: ${keywords || "local, community"}

[CTA]
Book your free 30-minute consult → https://bluedobiedev.com/contact

[Hashtags]
#${(business || "local").replace(/\s+/g, "")} #SmallBusiness

[Image Prompt]
Bright, minimal photo of ${business || "local service"} at work`;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  setCors(res, origin);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { business = "", offer = "", tone = "Friendly", platform = "Facebook", keywords = "" } = parseBody(req);

  // If no key, return stub (keeps tool usable)
  if (!client) {
    return res.status(200).json({ result: stubResult({ business, offer, tone, platform, keywords }), mode: "stub-no-key" });
  }

  try {
    const system = [
      "You write concise, brand-safe social posts for small LOCAL businesses.",
      "Return exactly these five labeled blocks:",
      "[Short] (~100 chars max)",
      "[Medium] (~220 chars max, platform-aware)",
      "[CTA] (one line linking to https://bluedobiedev.com/contact)",
      "[Hashtags] (3–6 simple tags, no giant blocks)",
      "[Image Prompt] (1 short line)",
      "No medical/financial claims. Plain, friendly language."
    ].join("\n");

    const user = [
      `Business: ${business || "Local service"}`,
      `Offer: ${offer || "General brand awareness"}`,
      `Tone: ${tone}`,
      `Platform: ${platform}`,
      `Keywords: ${keywords || "(none)"}`
    ].join("\n");

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    });

    const text = resp.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty model response.");
    return res.status(200).json({ result: text, mode: "openai" });
  } catch (err) {
    console.error("OpenAI error:", err?.message || err);
    return res.status(200).json({ result: stubResult({ business, offer, tone, platform, keywords }), mode: "fallback" });
  }
}