import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/lib/default-data";

const schema = z.object({
  name: z.string().min(2, "Укажите имя"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  householdName: z.string().min(2).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
      { status: 400 },
    );
  }
  const { name, email, password, householdName } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const household = await prisma.household.create({
    data: {
      name: householdName?.trim() || `Семья ${name}`,
      users: {
        create: { name, email: normalizedEmail, passwordHash, role: "OWNER" },
      },
      accounts: {
        create: [{ name: "Основной счёт", type: "card", isDefault: true }],
      },
      categories: {
        create: [
          ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, type: "INCOME" as const, isSystem: true })),
          ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, type: "EXPENSE" as const, isSystem: true })),
        ],
      },
    },
  });

  return NextResponse.json({ ok: true, householdId: household.id });
}
