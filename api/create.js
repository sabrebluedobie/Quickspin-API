// api/create.js  (SAFE MODE: no OpenAI)
const ALLOWED_ORIGINS = [
  "https://sabrebluedobie.github.io",
  "https://bluedobiedev.com"
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // Always answer preflight with the right headers
  if (req.method === "OPTIONS") {
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (!["POST"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { business = "(missing)", offer = "", tone = "Friendly", platform = "Facebook", keywords = "" } = body || {};

    // simple, guaranteed JSON (no external deps)
    return res.status(200).json({
      ok: true,
      echo: { business, offer, tone, platform, keywords }
    });
  } catch (e) {
    console.error("SAFE create error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}