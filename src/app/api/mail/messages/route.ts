import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { fetchMessageList } from "@/lib/imap";
import { recordContacts } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") || "INBOX";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
  const query = searchParams.get("q") || undefined;

  try {
    const result = await fetchMessageList(
      session.account.imap,
      folder,
      page,
      pageSize,
      query
    );
    // Se aprenden las direcciones vistas para poder autocompletar despues.
    // Solo en la primera pagina, y sin dejar que un fallo aqui rompa el listado.
    if (page === 1) {
      try {
        const vistos = result.messages.flatMap((m) => [
          { address: m.from.address, name: m.from.name },
          ...m.to.map((t) => ({ address: t.address, name: t.name })),
        ]);
        recordContacts(session.userId, vistos);
      } catch (err) {
        console.error("No se pudieron registrar los contactos:", err);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error fetching message list:", err);
    return NextResponse.json(
      { error: err.message || "Error al listar correos" },
      { status: 500 }
    );
  }
}
