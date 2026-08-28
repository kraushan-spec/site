import { NextResponse } from "next/server";
import { ApiAuthError } from "@/lib/session";

export function apiError(err: unknown) {
  if (err instanceof ApiAuthError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  const message = err instanceof Error ? err.message : "Внутренняя ошибка сервера";
  console.error(err);
  return NextResponse.json({ error: message }, { status: 400 });
}
