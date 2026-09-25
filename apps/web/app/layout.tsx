import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collaborative Code Editor",
  description: "Real-time collaborative code editor powered by CRDTs",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = toSessionUser(await auth());

  return (
    <html lang="en">
      <body>
        <Navbar user={user} />
        {children}
      </body>
    </html>
  );
}
