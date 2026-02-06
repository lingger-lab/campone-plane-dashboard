// Prisma config for system DB (campone_system)
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local for Next.js compatibility
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["SYSTEM_DATABASE_URL"] || process.env["DATABASE_URL"],
  },
});
