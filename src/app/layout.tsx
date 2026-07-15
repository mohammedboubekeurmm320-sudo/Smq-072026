import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QMS ISO 13485 Pro — Système de Management de la Qualité",
  description: "Plateforme QMS conforme ISO 13485:2016, ISO 14971, ICH Q10, IVDR. Multi-organisation, multi-tenant, signatures électroniques 21 CFR Part 11.",
  keywords: ["ISO 13485", "QMS", "qualité", "dispositifs médicaux", "CAPA", "audit interne", "ISO 14971", "21 CFR Part 11"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <I18nProvider>
              <AuthProvider>
                {children}
                <Toaster />
              </AuthProvider>
            </I18nProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}