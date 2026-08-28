import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const members = await prisma.user.findMany({
      where: { householdId: user.householdId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ members });
  } catch (err) {
    return apiError(err);
  }
}

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== "OWNER") {
      return NextResponse.json({ error: "Добавлять участников может только владелец семьи" }, { status: 403 });
    }
    const body = await req.json();
    const parsed = schema.parse(body);
    const email = parsed.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const member = await prisma.user.create({
      data: { householdId: user.householdId, name: parsed.name, email, passwordHash, role: "MEMBER" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
