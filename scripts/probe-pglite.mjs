import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec("CREATE TABLE t (id text, n int, ok boolean)");
await db.query("INSERT INTO t VALUES ($1, $2, $3)", ["a", 2, true]);
const result = await db.query("SELECT * FROM t WHERE id = $1", ["a"]);
console.log(JSON.stringify(result.rows));
await db.exec("BEGIN");
await db.query("INSERT INTO t VALUES ($1, $2, $3)", ["b", 3, false]);
await db.exec("COMMIT");
const all = await db.query("SELECT COUNT(*) AS count FROM t");
console.log(JSON.stringify(all.rows));
