import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// Carrega as variáveis de ambiente
config();

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("Please create a .env file with your database configuration");
  throw new Error("DATABASE_URL must be set in your .env file. Please ensure the database is provisioned and configured.");
}

export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  driver: "pg",
  strict: false,
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
