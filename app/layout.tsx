import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Auto-Remediate",
  description: "Event-driven Devin automation for Apache Superset",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <header className="nav-bar">
          <div className="max-w-page mx-auto px-8 h-full flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-sm font-semibold tracking-tight">Auto-Remediate</span>
              <span className="text-text-tertiary">/</span>
              <span className="font-mono text-xs text-text-secondary">kygchng/superset</span>
            </Link>
          </div>
        </header>
        <main className="max-w-page mx-auto px-8 py-10">{children}</main>
      </body>
    </html>
  );
}
