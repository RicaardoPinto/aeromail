import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import {
  getIdentities,
  saveIdentity,
  deleteIdentity,
} from "@/lib/storage";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  const identities = getIdentities(session.userId, session.email, session.name);
  return NextResponse.json({ identities });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Nombre y correo son obligatorios" },
        { status: 400 }
      );
    }

    const saved = saveIdentity(session.userId, body);
    return NextResponse.json({ identity: saved });
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
    return NextResponse.json({ error: "ID de identidad requerido" }, { status: 400 });
  }

  const success = deleteIdentity(session.userId, id);
  if (!success) {
    return NextResponse.json(
      { error: "No puedes eliminar la única identidad existente" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success });
}
