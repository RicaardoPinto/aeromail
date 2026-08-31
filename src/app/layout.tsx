import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AeroMail — Webmail Privado & Moderno",
  description: "Cliente webmail open-source moderno y soberano para tu VPS",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
