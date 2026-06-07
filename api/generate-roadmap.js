import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { goal } = req.body ?? {};
  if (typeof goal !== "string" || !goal.trim()) {
    return res.status(400).json({ error: "Goal is required" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Server is missing OPENAI_API_KEY" });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You design branching learning roadmaps shaped like a tree. " +
            "Respond ONLY with JSON matching this shape: " +
            '{ "label": string, "children": [ { "label": string, "children": [...] } ] }. ' +
            "The root label is the overall goal. Provide 3-5 top-level branches " +
            "(major areas), each with 2-4 child steps, and optionally one more level " +
            "of detail where it helps. Keep every label short (max ~8 words). " +
            "Maximum depth is 3 levels below the root. Leaf nodes may omit children.",
        },
        {
          role: "user",
          content: `Create a branching roadmap (as JSON) for this goal: "${goal.trim()}".`,
        },
      ],
    });

    const raw = completion.choices[0].message.content;
    let tree;
    try {
      tree = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "Model returned invalid JSON" });
    }

    if (!tree || typeof tree.label !== "string") {
      return res.status(502).json({ error: "Model returned an unexpected shape" });
    }

    res.status(200).json({ tree });
  } catch (err) {
    console.error("OpenAI request failed:", err);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
}
