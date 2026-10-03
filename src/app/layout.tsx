import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "INFORA — Da ideia ao produto. Do produto às vendas.",
  description:
    "INFORA é a plataforma inteligente para transformar ideias em produtos digitais, preparar sua comercialização, apoiar a divulgação e acompanhar resultados.",
  applicationName: "INFORA",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#050609] font-sans text-[#f7f8fa] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
