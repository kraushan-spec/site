import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { taskSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const tasks = await prisma.task.findMany({ where: { householdId: user.householdId }, orderBy: [{ isDone: "asc" }, { dueDate: "asc" }] });
    return NextResponse.json({ tasks });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = taskSchema.parse(body);
    const task = await prisma.task.create({
      data: { householdId: user.householdId, ...parsed, priority: parsed.priority ?? "WEEK" },
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
