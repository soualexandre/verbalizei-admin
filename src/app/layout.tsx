import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Raleway } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

// Identidade oficial (manual de marca, out/2026; como o web desde 19/10/2026):
// DM Sans no texto, Raleway nos títulos (font-display).
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const raleway = Raleway({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-raleway" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Verbalizei • Admin",
  description: "Painel administrativo do Verbalizei",
  icons: { icon: "/icone_verbalizei.png", apple: "/icone_verbalizei.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${raleway.variable} ${geistMono.variable} font-sans antialiased`}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
