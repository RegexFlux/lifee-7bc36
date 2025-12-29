import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import * as schema from "./schema";

declare global {
    // eslint-disable-next-line no-var
    var __lifeeSql: postgres.Sql | undefined;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
console.log("DB host:", DATABASE_URL);


const isProd = process.env.NODE_ENV === "production";

const sql =
    global.__lifeeSql ??
    postgres(DATABASE_URL, {
        max: isProd ? 2 : 5,                 // ✅ Lambda: limite
        idle_timeout: 20,                    // ✅ évite connexions zombie
        connect_timeout: 10,
        ssl: isProd ? "require" : undefined, // ✅ Supabase
    });

if (!isProd) global.__lifeeSql = sql;

export const db = drizzle(sql, {schema: {...schema}});
