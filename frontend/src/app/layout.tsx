import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "SIAGA — PsychoBot Clinical Care Platform",
  description:
    "Layanan konseling digital dengan chatbot Local AI live, dilindungi SIAGA Guardrail (ONNX + Stateful Intent Momentum) dan dilengkapi telemetri keamanan SOC.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} ${montserrat.variable} ${jetbrains.variable} font-sans`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
