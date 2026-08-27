import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { apiError } from "@/lib/api-helpers";
import { answerAssistantQuestion } from "@/lib/ai-assistant";
import { z } from "zod";

const schema = z.object({ message: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json();
    const { message } = schema.parse(body);
    const { answer, usedAi } = await answerAssistantQuestion(user.householdId, message);
    return NextResponse.json({ answer, usedAi });
  } catch (err) {
    return apiError(err);
  }
}
