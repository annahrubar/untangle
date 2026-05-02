import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: { done?: boolean; title?: string; deadline?: Date | null } = {};
    if (typeof body.done === "boolean") data.done = body.done;
    if (typeof body.title === "string") data.title = body.title;
    if ("deadline" in body) {
      if (body.deadline === null) {
        data.deadline = null;
      } else if (typeof body.deadline === "string" && body.deadline.trim()) {
        data.deadline = new Date(body.deadline + "T00:00:00.000Z");
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
    });
    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("patch error", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete error", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
