import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAI, MODEL } from "@/lib/openai";
import type { RecommendItem } from "@/lib/types";

const SYSTEM_PROMPT = `You are a calm, supportive coach helping someone choose what to do in the next 2 hours.

Given a list of active tasks (with priority and deadline), pick the TOP 3 to do right now and explain WHY for each.

Return JSON in this exact shape:

{
  "items": [
    {
      "id": "task-id-from-input",
      "title": "Same title as the task",
      "why": "1-2 sentences of warm, specific reasoning"
    }
  ]
}

Rules for the "why" field:
- Be specific: reference deadline urgency, priority, energy level, or how it unlocks other tasks.
- Be warm but direct. Like a thoughtful friend, not a productivity guru.
- NEVER say generic things like "high priority" or "urgent task" alone — explain WHAT makes it the right choice now.
- Each "why" must be 1-2 sentences max.
- Examples of good "why":
  - "Deadline is tomorrow morning, and it's a quick text — knock it out before it slips."
  - "It needs focus, and you have a clear two-hour window. Block it now."
  - "Lighter lift. Pair it with a coffee."

If there are fewer than 3 active tasks, return only as many as exist.
If there are no active tasks, return { "items": [] }.

Today is ${new Date().toISOString().slice(0, 10)} and the current time is ${new Date().toTimeString().slice(0, 5)}.

Return ONLY the JSON, no markdown fences.`;

export async function POST() {
  try {
    const tasks = await prisma.task.findMany({
      where: { done: false },
      orderBy: { createdAt: "desc" },
    });

    if (tasks.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const compactTasks = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      deadline: t.deadline ? t.deadline.toISOString().slice(0, 10) : null,
    }));

    const completion = await getOpenAI().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ tasks: compactTasks }) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content ?? '{"items":[]}';
    const parsed = JSON.parse(raw);
    const items: RecommendItem[] = Array.isArray(parsed.items)
      ? parsed.items.slice(0, 3)
      : [];

    return NextResponse.json({ items });
  } catch (err) {
    console.error("recommend error", err);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
