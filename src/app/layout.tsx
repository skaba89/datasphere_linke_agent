import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DataSphere — Automatisez votre présence LinkedIn avec l'IA",
  description:
    "DataSphere génère, optimise et publie automatiquement vos posts LinkedIn. Smart Poster IA, analytics avancées, planification intelligente.",
  keywords: [
    "LinkedIn", "IA", "automation", "Smart Poster", "content marketing",
    "SaaS", "DataSphere", "publication automatique",
  ],
  authors: [{ name: "DataSphere" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "DataSphere — LinkedIn Automation by IA",
    description:
      "Générez, optimisez et publiez vos posts LinkedIn automatiquement. Essai gratuit 14 jours.",
    url: "https://datasphere.app",
    siteName: "DataSphere",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DataSphere — LinkedIn Automation by IA",
    description:
      "Générez, optimisez et publiez vos posts LinkedIn automatiquement.",
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
