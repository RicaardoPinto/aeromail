import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Strict Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self';
    frame-src 'self' blob: data:;
    frame-ancestors 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // Attach enterprise security headers
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Frame-Options", "DENY"); // Clickjacking defense
  response.headers.set("X-Content-Type-Options", "nosniff"); // MIME-sniffing defense
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );

  // Anti-CSRF: Verify origin for state-changing requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    /*
      Comparacion exacta del host. Con `startsWith`, un origen como
      `https://webmail.lyf.cl.sitio-malo.com` pasaba la validacion porque
      empieza igual. Y si no venia cabecera `Origin` no se validaba nada:
      ahora una peticion que modifica estado sin origen se rechaza.
    */
    let originHost: string | null = null;
    if (origin) {
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = null;
      }
    }

    if (!host || originHost !== host) {
      return new NextResponse(
        JSON.stringify({ error: "Bloqueado por validación de origen CSRF" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
