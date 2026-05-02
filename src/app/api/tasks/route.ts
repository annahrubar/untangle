import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ParsedTask } from "@/lib/types";

export async function GET() {
  const tasks = await prisma.task.findMany({
    where: { parentId: null },
    include: {
      subtasks: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tasks });
}

type CreatePayload = {
  rawInput: string;
  selected: ParsedTask[]; // top-level tasks the user chose to save
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePayload;
    const { rawInput, selected } = body;

    if (!Array.isArray(selected) || selected.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const created = [];
    for (const t of selected) {
      const parent = await prisma.task.create({
        data: {
          rawInput,
          title: t.title,
          priority: t.priority,
          tag: t.tag ?? null,
          deadline: t.deadline ? new Date(t.deadline + "T00:00:00.000Z") : null,
        },
      });

      if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
        for (const s of t.subtasks) {
          await prisma.task.create({
            data: {
              rawInput,
              title: s.title,
              priority: s.priority,
              tag: s.tag ?? t.tag ?? null,
              deadline: s.deadline
                ? new Date(s.deadline + "T00:00:00.000Z")
                : parent.deadline,
              parentId: parent.id,
            },
          });
        }
      }

      const fullParent = await prisma.task.findUnique({
        where: { id: parent.id },
        include: { subtasks: true },
      });
      if (fullParent) created.push(fullParent);
    }

    return NextResponse.json({ tasks: created });
  } catch (err) {
    console.error("create tasks error", err);
    return NextResponse.json(
      { error: "Couldn't save these tasks. Try again?" },
      { status: 500 }
    );
  }
}
