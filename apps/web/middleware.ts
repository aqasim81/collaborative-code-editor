import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Unauthenticated requests to protected routes are redirected by `callbacks.authorized`.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*", "/room/:path*"],
};
