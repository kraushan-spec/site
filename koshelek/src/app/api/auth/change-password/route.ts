import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = schema.parse(body);

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

    const valid = await bcrypt.compare(parsed.currentPassword, dbUser.passwordHash);
    if (!valid) return NextResponse.json({ error: "Текущий пароль неверен" }, { status: 400 });

    const passwordHash = await bcrypt.hash(parsed.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
