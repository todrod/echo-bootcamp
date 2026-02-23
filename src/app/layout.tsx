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
      <body className="bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link href="/exam" className="text-sm font-semibold text-slate-900">
              Echo Bootcamp
            </Link>
            <a
              href="https://www.todrod.com"
              className="text-sm text-cyan-700 underline underline-offset-2 hover:text-cyan-600"
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
