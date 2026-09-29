/// <reference path="../types/nodemailer.d.ts" />
import nodemailer, { type Transporter } from "nodemailer";
import { EmailOutbox, Order } from "../models";
import { renderEmail, type OutboxRow } from "./email-templates";

const MAX_ATTEMPTS = 5;
// Baris PROCESSING yang tak kunjung selesai (fungsi mati di tengah kirim) diklaim ulang setelah ini.
const STUCK_AFTER_MS = 10 * 60 * 1000;

let transporter: Transporter | null | undefined;

// Tanpa SMTP_HOST (dev/test) email hanya dicatat ke log lalu ditandai SENT — sengaja eksplisit agar outbox tidak menumpuk.
function mailer(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return (transporter = null);
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } } : {}),
  });
  return transporter;
}

// Backoff eksponensial: 1, 2, 4, 8 menit.
export const retryDelayMs = (attempts: number) => 60_000 * 2 ** Math.max(0, attempts - 1);

async function claim(now: Date): Promise<(OutboxRow & { attempts: number }) | null> {
  return EmailOutbox.findOneAndUpdate(
    { $or: [{ status: "PENDING", nextAttemptAt: { $lte: now } }, { status: "PROCESSING", nextAttemptAt: { $lte: new Date(now.getTime() - STUCK_AFTER_MS) } }] },
    { $set: { status: "PROCESSING", nextAttemptAt: now }, $inc: { attempts: 1 } },
    { new: true, sort: { nextAttemptAt: 1 } },
  ).lean<OutboxRow & { attempts: number }>();
}

async function markTicketEmail(row: OutboxRow, status: "SENT" | "FAILED"): Promise<void> {
  if (row.type !== "ORDER_TICKETS" || !row.orderId) return;
  // Hanya ubah bila masih PENDING: permintaan kirim ulang yang lebih baru tidak boleh ditimpa hasil lama.
  await Order.updateOne({ id: row.orderId, ticketEmailStatus: "PENDING" }, { $set: { ticketEmailStatus: status } });
}

export interface OutboxResult { claimed: number; sent: number; retried: number; failed: number }

export async function processEmailOutbox(limit = 20): Promise<OutboxResult> {
  const result: OutboxResult = { claimed: 0, sent: 0, retried: 0, failed: 0 };
  const from = process.env.MAIL_FROM ?? "PassGo <no-reply@passgo.local>";
  for (let index = 0; index < limit; index += 1) {
    const row = await claim(new Date());
    if (!row) break;
    result.claimed += 1;
    try {
      const email = await renderEmail(row);
      const transport = mailer();
      if (transport) await transport.sendMail({ from, to: row.to, ...email });
      else console.info(`[email:dry-run] ${row.type} → ${row.to}: ${email.subject}\n${email.text}`);
      await EmailOutbox.updateOne({ id: row.id }, { $set: { status: "SENT", sentAt: new Date(), lastError: null } });
      await markTicketEmail(row, "SENT");
      result.sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const final = row.attempts >= MAX_ATTEMPTS;
      await EmailOutbox.updateOne({ id: row.id }, { $set: { status: final ? "FAILED" : "PENDING", lastError: message.slice(0, 1000), nextAttemptAt: new Date(Date.now() + retryDelayMs(row.attempts)) } });
      if (final) { await markTicketEmail(row, "FAILED"); result.failed += 1; } else result.retried += 1;
    }
  }
  return result;
}
