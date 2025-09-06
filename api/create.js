// api/create.js  (TEMP: wide-open CORS so we can verify connectivity)
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ALLOWED = new Set([
  "https://bluedobiedev.com",
  "https://www.bluedobiedev.com",
  "https://sabrebluedobie.github.io"
]);

function setCors(res, origin) {
  if (ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "*";
  setCors(res, origin);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { business = "", offer = "", tone = "Friendly", platform = "Facebook", keywords = "" } = body;

    // --- keep your real OpenAI call here if you have it wired ---
    // const completion = await client.chat.completions.create({ ... });
    // const text = completion.choices?.[0]?.message?.content?.trim();

    // Simple stub so we can confirm it works
    const text = `[Short]\nLocal ${business || "business"} — ${offer || "book today"}.\n\n[Medium]\n${tone} ${platform} post with keywords: ${keywords}\n\n[CTA]\nBook your free 30-minute consult → https://bluedobiedev.com/contact\n\n[Hashtags]\n#${(business||"local").replace(/\s+/g,'')} #SmallBusiness`;

    return res.status(200).json({ result: text });
  } catch (e) {
    console.error("QuickSpin error:", e);
    return res.status(500).json({ error: "Generation failed." });
  }
}