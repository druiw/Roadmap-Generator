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
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates simple, step-by-step learning roadmaps.",
        },
        {
          role: "user",
          content: `Create a roadmap for this goal: "${goal.trim()}". Give it as a numbered list of short steps.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 700,
    });

    res.status(200).json({ roadmap: completion.choices[0].message.content });
  } catch (err) {
    console.error("OpenAI request failed:", err);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
}
