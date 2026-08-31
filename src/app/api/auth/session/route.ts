import { NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { getUserData } from "@/lib/storage";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const userData = getUserData(session.userId, session.email, session.name);

  return NextResponse.json({
    user: {
      userId: session.userId,
      email: session.email,
      name: session.name,
      imapHost: session.account.imap.host,
      smtpHost: session.account.smtp.host,
    },
    identities: userData.identities,
    signatures: userData.signatures,
    preferences: userData.preferences,
  });
}
