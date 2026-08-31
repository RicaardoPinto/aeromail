import { NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { getMailboxes } from "@/lib/imap";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  if (session.userId.toLowerCase().includes("demo") || session.email.toLowerCase().includes("demo")) {
    const { DEMO_FOLDERS } = await import("@/lib/demo-data");
    return NextResponse.json({ folders: DEMO_FOLDERS });
  }

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
