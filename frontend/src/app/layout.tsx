import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hisar Travel ChatBot | Dashboard",
  description: "AI-powered Sales Agent ChatBot for Hisar Travel - Manage conversations, leads, and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
