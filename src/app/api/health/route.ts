import { json, api } from "@/server/http";
import { databaseKind } from "@/server/db/client";
import { aiConfigured } from "@/server/ai/provider";
import { smtpConfigured } from "@/server/notifications/mailer";

export const GET = api(async () => {
  return json({
    ok: true,
    database: await databaseKind(),
    ai: aiConfigured(),
    smtp: smtpConfigured(),
  });
});
