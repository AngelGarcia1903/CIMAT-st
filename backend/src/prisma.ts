import { PrismaClient } from "@prisma/client";

// Inicializa el cliente de Prisma.
// Se usa un enfoque global para evitar múltiples instancias en desarrollo.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
