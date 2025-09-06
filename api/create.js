import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { business, offer, tone, platform, keywords } = req.body || {};

    const system = `You write concise, brand-safe social posts for small local businesses.
    Output:
    [Short] (100 chars max)
    [Medium] (220 chars max)
    [CTA] with https://bluedobiedev.com/contact
    [Hashtags]
    [Image Prompt]`;

    const user = `Business: ${business}
    Offer: ${offer || "General brand awareness"}
    Tone: ${tone}
    Platform: ${platform}
    Keywords: ${keywords}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    });

    const text = completion.choices[0].message.content.trim();
    res.status(200).json({ result: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Generation failed" });
  }
}