import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { getActionItems } from "@/lib/task-center";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const items = await getActionItems(user.householdId);
    return NextResponse.json({ items });
  } catch (err) {
    return apiError(err);
  }
}
