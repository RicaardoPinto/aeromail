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
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "127.0.0.1";
    
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

    const finalImapHost = imapHost || `mail.${domain}`;
    const finalSmtpHost = smtpHost || `mail.${domain}`;

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

    const isDemo =
      email.toLowerCase().trim().startsWith("demo") ||
      password === "demo";

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
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
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
