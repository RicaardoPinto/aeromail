import { NextRequest, NextResponse } from "next/server";
import { testImapConnection } from "@/lib/imap";
import { testSmtpConnection } from "@/lib/smtp";
import { createSessionToken } from "@/lib/crypto";
import { ImapConfig, SmtpConfig, UserSession } from "@/lib/types";
import { SESSION_COOKIE_NAME } from "@/lib/auth-helper";
import { getUserData } from "@/lib/storage";

import { checkRateLimit, resetRateLimit } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    // El proxy agrega la IP real al FINAL de x-forwarded-for. Tomar el primer
    // valor dejaba que el cliente inventara la cabecera y estrenara contador en
    // cada intento, con lo que el limite anti fuerza bruta no servia de nada.
    const cadenaXff = req.headers.get("x-forwarded-for");
    const ip =
      cadenaXff?.split(",").pop()?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    
    // Check brute-force rate limit (max 5 failed attempts per 5 minutes)
    const rateCheck = checkRateLimit(ip, 5, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos. Por seguridad, espera ${rateCheck.retryAfterSec} segundos antes de volver a intentar.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      email,
      password,
      name,
      imapHost,
      imapPort = 993,
      imapSecure = true,
      smtpHost,
      smtpPort = 465,
      smtpSecure = true,
    } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo electrónico y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const domain = email.includes("@") ? email.split("@")[1] : "localhost";

    // Por defecto se asumia `mail.<dominio>`, que en una migracion apunta al
    // servidor viejo. Las variables permiten fijar el servidor correcto sin que
    // cada persona tenga que escribirlo a mano al entrar.
    const finalImapHost = imapHost || process.env.DEFAULT_IMAP_HOST || `mail.${domain}`;
    const finalSmtpHost = smtpHost || process.env.DEFAULT_SMTP_HOST || `mail.${domain}`;

    const imapConfig: ImapConfig = {
      host: finalImapHost,
      port: Number(imapPort),
      secure: Boolean(imapSecure),
      auth: {
        user: email,
        pass: password,
      },
    };

    const smtpConfig: SmtpConfig = {
      host: finalSmtpHost,
      port: Number(smtpPort),
      secure: Boolean(smtpSecure),
      auth: {
        user: email,
        pass: password,
      },
    };

    // Segundo limite, por cuenta: sin esto, rotar la IP de origen permitia
    // seguir probando contrasenas contra una misma direccion.
    const limiteCuenta = checkRateLimit(`cuenta:${email.toLowerCase().trim()}`, 10, 15 * 60 * 1000);
    if (!limiteCuenta.allowed) {
      return NextResponse.json(
        {
          error: `Demasiados intentos para esta cuenta. Espera ${limiteCuenta.retryAfterSec} segundos.`,
        },
        { status: 429 }
      );
    }

    /*
      El modo demostracion se salta la verificacion de credenciales, asi que
      solo existe si se habilita a proposito y nunca en produccion.

      Antes bastaba con escribir "demo" como contrasena de CUALQUIER direccion
      real para obtener una sesion valida a nombre de esa cuenta, con acceso a
      sus firmas, identidades y preferencias guardadas.
    */
    const demoHabilitado =
      process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
    const isDemo =
      demoHabilitado && email.toLowerCase().trim().endsWith("@demo.local");

    if (!isDemo) {
      // Test real IMAP connection
      const imapOk = await testImapConnection(imapConfig);
      if (!imapOk) {
        return NextResponse.json(
          {
            error:
              "No se pudo conectar al servidor IMAP. Verifica el servidor, puerto, usuario o contraseña.",
          },
          { status: 401 }
        );
      }
    }

    const userId = email.toLowerCase().trim();
    const userName = name || email.split("@")[0];

    // Seed/initialize user data
    getUserData(userId, email, userName);

    const session: UserSession = {
      userId,
      email,
      name: userName,
      account: {
        imap: imapConfig,
        smtp: smtpConfig,
      },
    };

    // Credenciales validas: se limpian los contadores de intentos fallidos.
    resetRateLimit(ip);
    resetRateLimit(`cuenta:${userId}`);

    const token = await createSessionToken(session);

    const response = NextResponse.json({
      success: true,
      user: {
        userId,
        email,
        name: userName,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // El webmail no necesita navegacion entre sitios, y la cookie contiene la
      // contrasena de correo cifrada: conviene el modo mas estricto.
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 horas, antes 7 dias
    });

    return response;
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { error: err.message || "Error interno durante el inicio de sesión" },
      { status: 500 }
    );
  }
}
