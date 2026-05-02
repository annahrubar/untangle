import { NextResponse } from "next/server";
import { openai, MODEL } from "@/lib/openai";
import type { ParsedTask } from "@/lib/types";

const SYSTEM_PROMPT = `You are an assistant that parses casual brain-dump text into structured tasks.

The user pastes a paragraph that may contain:
- One simple task ("text Slava about the video")
- Multiple unrelated tasks ("text Slava, finalize Q2 plan, buy gift for mom")
- One complex task with logical sub-steps ("prepare for the meeting — make slides and add people to the call")

Decide which structure fits and return a JSON object with this exact shape:

{
  "tasks": [
    {
      "title": "Short imperative task name (5-8 words max)",
      "priority": "high" | "medium" | "low",
      "deadline": "YYYY-MM-DD" | null,
      "subtasks": [ { same shape, no nested subtasks } ]
    }
  ]
}

Rules:
- If the text contains multiple unrelated items, return them as separate tasks (no subtasks).
- If the text describes ONE goal with logical sub-steps, return ONE parent task with 2-4 subtasks.
- Use "high" for urgent/today/tomorrow/asap markers.
- Use "low" for someday/eventually/maybe markers.
- Use "medium" by default.
- Deadline is date-only ISO format (YYYY-MM-DD) — no time. Today is ${new Date().toISOString().slice(0, 10)}.
- "tomorrow" means tomorrow's date. "Friday" means the next Friday. If no time/date hint at all, deadline is null.
- Title should be a clean, polished imperative form (capitalize first letter, no trailing punctuation).
- Never invent tasks not present in the text.
- Subtasks (if any) inherit the parent's deadline unless they have their own.

Return ONLY the JSON object, no markdown fences, no commentary.`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? '{"tasks":[]}';
    const parsed = JSON.parse(raw);
    const tasks: ParsedTask[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("parse error", err);
    return NextResponse.json(
      { error: "Hmm, that didn't quite work. Try again?" },
      { status: 500 }
    );
  }
}
