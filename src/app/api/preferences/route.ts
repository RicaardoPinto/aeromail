import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { getPreferences, updatePreferences } from "@/lib/storage";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  const preferences = getPreferences(session.userId);
  return NextResponse.json({ preferences });
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const updated = updatePreferences(session.userId, body);
    return NextResponse.json({ preferences: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
