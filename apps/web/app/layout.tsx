import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collaborative Code Editor",
  description: "Real-time collaborative code editor powered by CRDTs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
