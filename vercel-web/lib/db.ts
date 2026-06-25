import { neon } from "@neondatabase/serverless";
import { env, requireEnv } from "@/lib/env";

export const sql = neon(requireEnv(env.databaseUrl, "DATABASE_URL"));

export async function queryRows<T>(query: string, params: unknown[] = []): Promise<T[]> {
  return (await sql(query, params)) as T[];
}
