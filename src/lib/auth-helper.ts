import { cookies } from "next/headers";
import { verifySessionToken } from "./crypto";
import { UserSession } from "./types";
import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "aeromail_session";

export async function getAuthSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function unauthorizedResponse(message = "Sesión inválida o expirada") {
  return NextResponse.json({ error: message }, { status: 401 });
}
