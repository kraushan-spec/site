import { auth } from "@/lib/auth";

export type AppSessionUser = {
  id: string;
  householdId: string;
  role: string;
  name?: string | null;
  email?: string | null;
};

/** Returns the current household-scoped user, or null when unauthenticated. */
export async function getSessionUser(): Promise<AppSessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user;
  return {
    id: user.id,
    householdId: user.householdId,
    role: user.role,
    name: user.name,
    email: user.email,
  };
}

/** Throws (as a Response) when there is no authenticated session — use in API routes. */
export async function requireSessionUser(): Promise<AppSessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiAuthError();
  }
  return user;
}

export class ApiAuthError extends Error {
  status = 401;
  constructor() {
    super("Не авторизован");
  }
}
