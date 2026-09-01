import { NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { getMailboxes } from "@/lib/imap";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const folders = await getMailboxes(session.account.imap);
    return NextResponse.json({ folders });
  } catch (err: any) {
    console.error("Error fetching folders:", err);
    return NextResponse.json(
      { error: err.message || "Error al obtener carpetas del buzón" },
      { status: 500 }
    );
  }
}
