import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import {
  getSignatures,
  saveSignature,
  deleteSignature,
} from "@/lib/storage";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  const signatures = getSignatures(session.userId, session.email, session.name);
  return NextResponse.json({ signatures });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    if (!body.name || !body.htmlContent) {
      return NextResponse.json(
        { error: "Nombre y contenido HTML de la firma son obligatorios" },
        { status: 400 }
      );
    }

    const saved = saveSignature(session.userId, body);
    return NextResponse.json({ signature: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID de firma requerido" }, { status: 400 });
  }

  const success = deleteSignature(session.userId, id);
  return NextResponse.json({ success });
}
