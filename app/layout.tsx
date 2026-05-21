import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Devin Auto-Remediate",
  description: "Event-driven Devin automation for Apache Superset",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <header
          style={{ borderBottom: "1px solid var(--border)" }}
          className="h-12 flex items-center px-12"
        >
          <nav className="flex items-center gap-8 max-w-page mx-auto w-full">
            <span className="font-semibold text-sm tracking-tight">
              Devin Auto-Remediate
            </span>
            <div className="flex items-center gap-6 ml-8">
              <Link
                href="/"
                className="text-sm text-text-secondary hover:text-text transition-colors duration-100"
              >
                Dashboard
              </Link>
              <Link
                href="/runs"
                className="text-sm text-text-secondary hover:text-text transition-colors duration-100"
              >
                Runs
              </Link>
            </div>
          </nav>
        </header>
        <main className="max-w-page mx-auto px-12 py-8">{children}</main>
      </body>
    </html>
  );
}
