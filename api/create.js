export default async function handler(req, res) {
  const allowed = [
    "https://sabrebluedobie.github.io",
    "https://bluedobiedev.com"
  ];
  const origin = req.headers.origin || "";
  if (req.method === "OPTIONS") {
    if (allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    return res.status(204).end();
  }
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { business, offer, tone, platform, keywords } = req.body || {};
    if (!business) {
      return res.status(400).json({ error: "Missing 'business' field." });
    }

    // Temporary template response
    const text = `
[Short]
Local ${business} — ${offer || "book today"}! Fast, friendly, reliable.

[Medium]
Need help with ${business}? ${offer || "We keep it simple and affordable."} On-time, local, and hassle-free.

[CTA]
Book your free 30-minute consult → https://bluedobiedev.com/contact

[Hashtags]
#${(business||"local").replace(/\s+/g,'')} #SmallBusiness #LocalService #${(tone||"Friendly").replace(/\s+/g,'')}
`.trim();

    return res.status(200).json({ result: text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Generation failed." });
  }
}