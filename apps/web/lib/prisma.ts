import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

// Reuse one client across hot reloads in development so connections aren't exhausted.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
