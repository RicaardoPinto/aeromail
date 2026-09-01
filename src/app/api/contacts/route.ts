import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { getContacts, recordContacts } from "@/lib/storage";

/** Devuelve los contactos conocidos, ya ordenados por uso */
export async function GET() {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    return NextResponse.json({ contacts: getContacts(session.userId) });
  } catch (err: any) {
    console.error("Error reading contacts:", err);
    return NextResponse.json(
      { error: err.message || "Error al leer los contactos" },
      { status: 500 }
    );
  }
}

/** Registra direcciones vistas o usadas para que aparezcan al autocompletar */
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const { entries } = await req.json();

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Se esperaba una lista de direcciones" },
        { status: 400 }
      );
    }

    const contacts = recordContacts(session.userId, entries);
    return NextResponse.json({ contacts });
  } catch (err: any) {
    console.error("Error recording contacts:", err);
    return NextResponse.json(
      { error: err.message || "Error al registrar los contactos" },
      { status: 500 }
    );
  }
}
