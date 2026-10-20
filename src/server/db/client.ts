import fs from "fs";
import path from "path";
import { SCHEMA_SQL } from "@/server/db/schema";

export type Db = {
  kind: "pglite" | "postgres";
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
};

let active: Db | null = null;
let opening: Promise<Db> | null = null;

type PgliteClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  exec: (sql: string) => Promise<unknown>;
};

export async function createMemoryDatabase(): Promise<Db> {
  return openPglite(true);
}

export function setDatabase(db: Db | null) {
  active = db;
  opening = null;
}

export async function getDb(): Promise<Db> {
  if (active) return active;
  if (!opening) opening = openDefault();
  active = await opening;
  return active;
}

async function openDefault(): Promise<Db> {
  if (process.env.NODE_ENV === "production" && process.env.PASSWORD_RESET_DEBUG === "true") {
    throw new Error("PASSWORD_RESET_DEBUG doit être désactivé en production.");
  }
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("postgres")) return openPostgres(url);
  return openPglite(false);
}

async function openPostgres(connectionString: string): Promise<Db> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString, max: 10 });
  return {
    kind: "postgres",
    async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params as never[]);
      return result.rows as T[];
    },
    async exec(sql) {
      await pool.query(sql);
    },
  };
}

async function openPglite(memory: boolean): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = memory
    ? new PGlite()
    : new PGlite(path.join(process.cwd(), "data", "pglite"));
  const ready = client as PgliteClient & { waitReady?: Promise<void> };
  if (ready.waitReady) await ready.waitReady;
  return {
    kind: "pglite",
    async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return result.rows as T[];
    },
    async exec(sql) {
      await client.exec(sql);
    },
  };
}

export async function migrate(db: Db): Promise<void> {
  await db.exec(SCHEMA_SQL);
  // Les comptes Google et téléphone n'ont pas toujours de courriel ni de mot de passe.
  await db.exec("ALTER TABLE users ALTER COLUMN email DROP NOT NULL");
  await db.exec("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL");
  const columns = await db.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'country_code'",
  );
  if (columns.length === 0) {
    await db.exec("ALTER TABLE profiles ADD COLUMN country_code TEXT DEFAULT 'CA'");
  }
  await db.exec("UPDATE profiles SET country_code = 'CA' WHERE country_code IS NULL");
  const chosen = await db.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'country_chosen'",
  );
  if (chosen.length === 0) {
    await db.exec("ALTER TABLE profiles ADD COLUMN country_chosen BOOLEAN NOT NULL DEFAULT FALSE");
    await db.exec("UPDATE profiles SET country_chosen = TRUE WHERE onboarding_completed = TRUE");
  }
}

export async function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(sql, params);
}

export async function one<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql: string): Promise<void> {
  const db = await getDb();
  await db.exec(sql);
}

export function asNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function asNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function asBoolean(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function logError(error: unknown, context: string): Promise<void> {
  const message = error instanceof Error ? error.message : "Erreur inconnue";
  console.error("[mijote]", context, message);
  try {
    const db = await getDb();
    await db.query(
      "INSERT INTO app_errors (id, message, context, created_at) VALUES ($1, $2, $3, $4)",
      [crypto.randomUUID(), message.slice(0, 500), context.slice(0, 200), new Date().toISOString()],
    );
  } catch {
    // La journalisation ne doit pas masquer l'erreur d'origine.
  }
}

export function databaseKind(): Promise<"pglite" | "postgres"> {
  return getDb().then((db) => db.kind);
}

export function dataFile(name: string): string {
  return path.join(process.cwd(), "data", name);
}

export function readJsonFile<T>(name: string): T {
  return JSON.parse(fs.readFileSync(dataFile(name), "utf8")) as T;
}
