import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Echo Bootcamp",
  description: "Private self-hosted echo study suite",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,rgba(56,189,248,0.22),transparent_40%),radial-gradient(circle_at_90%_85%,rgba(20,184,166,0.2),transparent_40%),#090c14] text-slate-100">
        <header className="border-b border-white/10 bg-black/25 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/exam" className="rounded-md px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
              Echo Bootcamp
            </Link>
            <a
              href="https://www.todrod.com"
              className="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Back to todrod.com
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
