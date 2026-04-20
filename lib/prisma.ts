import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost/mora";
  // Pass ssl:true for connections that require it (e.g. db.prisma.io)
  const requireSsl = connectionString.includes("sslmode=require") || connectionString.includes("db.prisma.io");
  const adapter = new PrismaPg({
    connectionString,
    ...(requireSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
