import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SentryProvider } from "@/components/sentry-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkedInPost — Gestion intelligente de contenu LinkedIn",
  description:
    "Générez, planifiez et publiez automatiquement vos posts LinkedIn avec l'IA. Analytics, planification intelligente, multi-comptes.",
  keywords: [
    "LinkedIn", "IA", "automation", "content marketing",
    "SaaS", "LinkedInPost", "publication automatique", "gestion contenu",
  ],
  authors: [{ name: "LinkedInPost" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "LinkedInPost — Gestion intelligente de contenu LinkedIn",
    description:
      "Générez, planifiez et publiez vos posts LinkedIn automatiquement.",
    siteName: "LinkedInPost",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedInPost — Gestion de contenu LinkedIn",
    description:
      "Générez, planifiez et publiez vos posts LinkedIn automatiquement.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SentryProvider>
          {children}
          <Toaster />
        </SentryProvider>
      </body>
    </html>
  );
}
