import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import * as auth from './schema.auth';
import * as studio from './schema.studio';
import * as album from './schema.album';
import * as billing from './schema.billing';

declare global {
    // eslint-disable-next-line no-var
    var __lifeeSql: postgres.Sql | undefined;
}

const sql =
    global.__lifeeSql ??
    postgres(process.env.DATABASE_URL as string, {
        max: 5,
        // ssl: "require", // si besoin selon ton provider
    });

if (process.env.NODE_ENV !== "production") global.__lifeeSql = sql;

const mergedSchema = {...schema, ...auth, ...studio, ...album, ...billing};

export const db = drizzle(sql, {schema: mergedSchema});
