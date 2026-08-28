import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const parsed = schema.parse(body);
    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.endpoint },
      create: { userId: user.id, endpoint: parsed.endpoint, p256dh: parsed.keys.p256dh, auth: parsed.keys.auth },
      update: { userId: user.id, p256dh: parsed.keys.p256dh, auth: parsed.keys.auth },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireSessionUser();
    const { endpoint } = await req.json();
    if (typeof endpoint === "string") {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
