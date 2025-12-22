import type { Config } from "drizzle-kit";

export default {
    schema: ["./src/lib/db/schema.ts", "./src/lib/db/schema.auth.ts", "./src/lib/db/schema.studio.ts"],
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
