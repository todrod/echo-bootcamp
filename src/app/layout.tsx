import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Echo Bootcamp",
  description: "Private self-hosted echo study suite",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
