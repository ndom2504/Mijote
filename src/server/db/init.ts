import { migrate } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { seed } from "@/server/db/seed";

let ready: Promise<void> | null = null;

export function readyDatabase(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = await getDb();
      await migrate(db);
      await seed();
    })();
  }
  return ready;
}
