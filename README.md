# ✉️ AeroMail — Webmail Open-Source Soberano & Moderno

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![IMAP/SMTP](https://img.shields.io/badge/Protocols-IMAP%20%7C%20SMTP%20(TLS)-emerald)](https://github.com/nodemailer/imapflow)

**AeroMail** es un cliente Webmail moderno, ultrarrápido, soberano y de código abierto diseñado para montarse directamente en tu VPS, libre de rastreadores o dependencias de proveedores externos.

Ofrece una interfaz minimalista inspirada en **Apple Mail** y **Linear**, un estudio de **gestión de firmas corporativas proporcionales y sutiles**, y está optimizado para consumir menos de **60-100MB de RAM** en tu servidor.

---

## ✨ Características Principales

- 🎨 **Diseño Moderno & Minimalista**: Layout de 3 columnas, modo oscuro/claro nativo y microinteracciones fluidas.
- 🖋️ **Estudio de Firmas Corporativas (No Invasivas)**:
  - Generación de firmas proporcionales con **tipografía sutil** para que la firma no le reste protagonismo al mensaje.
  - Carga de logotipo corporativo (con soporte de formas circulares, redondeadas o cuadradas).
  - Paletas de colores corporativos y selector de color HEX exacto.
  - Inserción de redes sociales e información de contacto estructurada.
- 🔒 **Seguridad y Privacidad Estricta**:
  - Cifrado simétrico de credenciales en memoria y sesión con **AES-256-GCM**.
  - Aislamiento hermético de correos dentro de un **`<iframe>` Sandboxed** sin ejecución de scripts.
  - **Bloqueo proactivo de tracking pixels e imágenes remotas** para evitar fugas de IP.
  - Protección anti-fuerza bruta en el login mediante Rate Limiting de ventana deslizante.
  - Cabeceras de seguridad CSP (Content Security Policy) y validación anti-CSRF.
- ⚡ **Alto Rendimiento en VPS**:
  - Conector IMAP asíncrono con `imapflow`.
  - Persistencia ligera local sin requerir bases de datos pesadas.
  - Imagen Docker multi-stage optimizada (< 150MB).
- ⌨️ **Atajos de Teclado**:
  - `C`: Redactar nuevo correo.
  - `/`: Búsqueda instantánea en buzón.
  - `Esc`: Cerrar modales o visores.
  - `Ctrl / Cmd + Enter`: Enviar correo en el redactor.

---

## 🚀 Despliegue en tu VPS (Paso a Paso)

### 1. Requisitos Previos
- Un VPS con Linux (Ubuntu o Debian).
- **Docker** y **Docker Compose** instalados.
- Un subdominio apuntando a la IP de tu VPS (ejemplo: `mail.tudominio.com`).

### 2. Clonar y Configurar
```bash
# 1. Clona el repositorio en tu VPS
git clone https://github.com/tu-usuario/aeromail.git
cd aeromail

# 2. Configura las variables de entorno
cp .env.example .env
```

Edita `.env` y genera una clave segura:
```bash
APP_SECRET=tu_clave_secreta_super_segura_de_32_caracteres_o_mas
```

### 3. Configurar tu Subdominio en Caddy
Edita el archivo `Caddyfile`:
```caddy
mail.tudominio.com {
    reverse_proxy aeromail:3000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
    }

    encode gzip zstd
}
```

### 4. Iniciar con Docker Compose
```bash
docker compose up -d --build
```

¡Listo! Caddy aprovisionará automáticamente el certificado SSL (HTTPS) con Let's Encrypt y podrás acceder a tu webmail en `https://mail.tudominio.com`.

---

## 💻 Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) o [http://localhost:3001](http://localhost:3001) en tu navegador.

---

## 📄 Licencia

Este proyecto es 100% de código abierto bajo la licencia [MIT](LICENSE).
