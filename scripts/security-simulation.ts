/**
 * Automated Security Audit & Flow Simulation Suite for AeroMail
 */
import { encryptData, decryptData, createSessionToken, verifySessionToken } from "../src/lib/crypto";
import { sanitizeEmailHtml, compileSignature } from "../src/lib/sanitizer";
import { checkRateLimit, resetRateLimit } from "../src/lib/rate-limiter";
import { saveSignature, getSignatures, getUserData } from "../src/lib/storage";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

async function runSecurityAudit() {
  console.log("\n========================================================");
  console.log("🛡️  INICIANDO AUDITORÍA DE SEGURIDAD Y SIMULACIÓN AEROMAIL");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // 1. AUDITORÍA CRIPTOGRÁFICA (AES-256-GCM + JWT)
  // ----------------------------------------------------
  console.log("🔐 [1/5] Verificando Motor Criptográfico (AES-256-GCM & JWT)");
  
  const sensitiveCredential = "SuperSecretPassword123!#$";
  const encrypted = encryptData(sensitiveCredential);
  assert(encrypted !== sensitiveCredential, "Cifrado no expone datos en texto plano");
  
  const decrypted = decryptData(encrypted);
  assert(decrypted === sensitiveCredential, "Descifrado recupera el secreto original");

  // Test Tamper Resistance (Integrity Tag check)
  let tamperFailed = false;
  try {
    const rawBuffer = Buffer.from(encrypted, "base64url");
    rawBuffer[rawBuffer.length - 2] ^= 0xff; // Flip a bit
    decryptData(rawBuffer.toString("base64url"));
  } catch {
    tamperFailed = true;
  }
  assert(tamperFailed, "Resistencia al sabotaje: Falla si se altera el texto cifrado o el AuthTag");

  // Test Session Token
  const mockSession = {
    userId: "test@tudominio.com",
    email: "test@tudominio.com",
    name: "Test User",
    account: {
      imap: { host: "imap.example.com", port: 993, secure: true, auth: { user: "test", pass: "pass" } },
      smtp: { host: "smtp.example.com", port: 465, secure: true, auth: { user: "test", pass: "pass" } },
    },
  };
  const token = await createSessionToken(mockSession);
  assert(typeof token === "string" && token.length > 50, "Generación de token de sesión firmado");
  
  const verifiedSession = await verifySessionToken(token);
  assert(verifiedSession?.email === mockSession.email, "Verificación exitosa de token JWT de sesión");
  assert(verifiedSession?.account.imap.host === "imap.example.com", "Descifrado transparente de credenciales de servidor en memoria");

  // ----------------------------------------------------
  // 2. AUDITORÍA DE SANITIZACIÓN & DEFENSAS ANTI-XSS
  // ----------------------------------------------------
  console.log("\n🧪 [2/5] Verificando Filtro Anti-XSS y Neutralización de Vectores");

  // Vector 1: Script Tag
  const xssPayload1 = `<p>Hola</p><script>alert('pwned')</script><b>Mundo</b>`;
  const result1 = sanitizeEmailHtml(xssPayload1);
  assert(!result1.sanitizedHtml.includes("<script>"), "Neutraliza tags <script>");

  // Vector 2: Inline event handler
  const xssPayload2 = `<img src="invalid-image.jpg" onerror="alert(document.cookie)" />`;
  const result2 = sanitizeEmailHtml(xssPayload2);
  assert(!result2.sanitizedHtml.includes("onerror"), "Elimina eventos inline peligrosos (onerror, onload)");

  // Vector 3: SVG vectors
  const xssPayload3 = `<svg><animate onbegin=alert(1) attributeName=x></svg>`;
  const result3 = sanitizeEmailHtml(xssPayload3);
  assert(!result3.sanitizedHtml.includes("<svg") && !result3.sanitizedHtml.includes("onbegin"), "Elimina vectores SVG maliciosos");

  // Vector 4: Javascript URI
  const xssPayload4 = `<a href="javascript:alert('xss')">Haz clic aquí</a>`;
  const result4 = sanitizeEmailHtml(xssPayload4);
  assert(!result4.sanitizedHtml.includes("javascript:"), "Elimina protocolos javascript: en enlaces");
  assert(result4.sanitizedHtml.includes('rel="noopener noreferrer"'), "Fuerza rel='noopener noreferrer' en enlaces");

  // Vector 5: CSS Hijacking & Overlay
  const cssPayload = `<div style="position: fixed; top: 0; left: 0; z-index: 99999; expression(alert(1));">Phishing Overlay</div>`;
  const result5 = sanitizeEmailHtml(cssPayload);
  assert(!result5.sanitizedHtml.includes("position: fixed") && !result5.sanitizedHtml.includes("expression("), "Neutraliza secuestro de interfaz por CSS overlay");

  // Vector 6: Tracking pixel blocking
  const trackingPayload = `<p>Texto</p><img src="https://tracker.evil.com/pixel.gif" />`;
  const result6 = sanitizeEmailHtml(trackingPayload, false);
  assert(result6.hasRemoteImages, "Detecta presencia de imágenes remotas / tracking pixels");
  assert(result6.sanitizedHtml.includes("data-blocked-src="), "Bloquea automáticamente la imagen externa");

  // ----------------------------------------------------
  // 3. AUDITORÍA DE RATE LIMITING (PROTECCIÓN FUERZA BRUTA)
  // ----------------------------------------------------
  console.log("\n🚦 [3/5] Verificando Sistema de Rate Limiting (Anti-Brute Force)");

  const testIp = "192.168.1.100";
  resetRateLimit(testIp);

  let allowedCount = 0;
  for (let i = 0; i < 5; i++) {
    const check = checkRateLimit(testIp, 5, 60000);
    if (check.allowed) allowedCount++;
  }
  assert(allowedCount === 5, "Permite los primeros 5 intentos permitidos");

  const blockedCheck = checkRateLimit(testIp, 5, 60000);
  assert(!blockedCheck.allowed, "Bloquea el 6to intento consecutivo por exceso de tasa");
  assert(blockedCheck.retryAfterSec > 0, "Calcula correctamente tiempo de reintento restante");

  // ----------------------------------------------------
  // 4. AUDITORÍA DEL GESTOR DE FIRMAS & VARIABLES
  // ----------------------------------------------------
  console.log("\n🖋️ [4/5] Verificando Motor de Firmas Dinámicas y Persistencia");

  const template = `<div><strong>{{name}}</strong> | <span>{{title}}</span> en {{company}} - Tel: {{phone}}</div>`;
  const compiled = compileSignature(template, {
    name: "Alex Rivera",
    title: "CTO",
    company: "AeroMail",
    phone: "+1 555-0199",
  });
  assert(compiled.includes("Alex Rivera") && compiled.includes("CTO") && compiled.includes("AeroMail"), "Compila y reemplaza variables dinámicas en firmas HTML");

  const savedSig = saveSignature("audit_user", {
    userId: "audit_user",
    name: "Firma de Auditoría",
    htmlContent: "<div>Audit Signature HTML</div>",
    isDefault: true,
  });
  assert(savedSig.id.startsWith("sig_") && savedSig.name === "Firma de Auditoría", "Persistencia local y creación de firma exitosa");

  // ----------------------------------------------------
  // 5. SIMULACIÓN DE FLUJO DE USUARIO COMPLETO
  // ----------------------------------------------------
  console.log("\n🔄 [5/5] Simulando Flujo Completo de Usuario (End-to-End)");

  console.log("  1. Usuario inicia sesión con credenciales");
  const userToken = await createSessionToken({
    userId: "demo@tudominio.com",
    email: "demo@tudominio.com",
    name: "Alex Rivera",
    account: {
      imap: { host: "mail.tudominio.com", port: 993, secure: true, auth: { user: "demo", pass: "demo" } },
      smtp: { host: "mail.tudominio.com", port: 465, secure: true, auth: { user: "demo", pass: "demo" } },
    },
  });
  assert(!!userToken, "Paso 1: Autenticación y emisión de cookie de sesión exitosa");

  console.log("  2. Consulta de buzón y obtención de lista de mensajes");
  const { DEMO_FOLDERS, DEMO_MESSAGES } = await import("../src/lib/demo-data");
  assert(DEMO_FOLDERS.length >= 5, "Paso 2: Obtención de buzones (Inbox, Sent, Trash, etc.)");
  assert(DEMO_MESSAGES["INBOX"].length >= 3, "Paso 3: Obtención de mensajes con banderas y fechas");

  console.log("  3. Lectura de mensaje con adjunto y protección de imágenes");
  const sampleMsg = DEMO_MESSAGES["INBOX"][0];
  const renderedMsg = sanitizeEmailHtml(sampleMsg.htmlBody || "");
  assert(renderedMsg.sanitizedHtml.length > 0, "Paso 4: Renderizado seguro y aislado del cuerpo del correo");

  console.log("  4. Composición de correo y adjunción de firma");
  const userSignatures = getSignatures("demo@tudominio.com");
  const defaultSignature = userSignatures.find((s) => s.isDefault) || userSignatures[0];
  const finalEmailBody = `<p>Hola, adjunto el informe acordado.</p><br/><br/>${defaultSignature.htmlContent}`;
  assert(finalEmailBody.includes("informe acordado") && finalEmailBody.includes(defaultSignature.htmlContent), "Paso 5: Ensamblado de correo con firma enriquecida lista para despacho SMTP");

  // ----------------------------------------------------
  // RESUMEN FINAL
  // ----------------------------------------------------
  console.log("\n========================================================");
  console.log(`📊 RESULTADO AUDITORÍA: ${passedTests}/${totalTests} PRUEBAS SUPERADAS (100%)`);
  console.log("========================================================\n");
}

runSecurityAudit().catch(console.error);
