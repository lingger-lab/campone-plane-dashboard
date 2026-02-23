// Prisma config for tenant DB (camp_{tenant}_db)
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/tenant/schema.prisma",
  migrations: {
    path: "prisma/tenant/migrations",
  },
  datasource: {
    url: process.env["TENANT_DATABASE_URL"] || process.env["DATABASE_URL"],
  },
});
