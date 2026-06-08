import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Database URL is optional since the user is using Firebase.
// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : ({} as any);
export const db = process.env.DATABASE_URL ? drizzle(pool as any, { schema }) : ({} as any);

export * from "./schema";
