import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { CSSProperties } from "react";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// Sonner's own colours, mapped onto the shadcn theme tokens.
const toasterStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as CSSProperties;

export const metadata: Metadata = {
  title: "Collaborative Code Editor",
  description: "Real-time collaborative code editor powered by CRDTs",
  openGraph: {
    title: "Collaborative Code Editor",
    description: "Write code together in real time: conflict-free sync, live cursors and presence.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = toSessionUser(await auth());

  return (
    <html lang="en" className={geist.variable}>
      <body>
        <Navbar user={user} />
        {children}
        <Toaster theme="system" style={toasterStyle} />
      </body>
    </html>
  );
}
