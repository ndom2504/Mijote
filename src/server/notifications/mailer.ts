import nodemailer from "nodemailer";
import { logError } from "@/server/db/client";

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendMail(to: string, subject: string, text: string): Promise<{ sent: boolean; reason?: string }> {
  if (!smtpConfigured()) return { sent: false, reason: "unconfigured" };
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === "465",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
    await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
    return { sent: true };
  } catch (error) {
    await logError(error, "smtp");
    return { sent: false, reason: "failed" };
  }
}
