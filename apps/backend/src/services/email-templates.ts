import type { Attachment } from "nodemailer";
import { toBuffer } from "qrcode";
import { Event, Order, Ticket } from "../models";
import { formatTicketCode, qrPayload } from "../utils/ticket-code";

export interface OutboxRow { id: string; type: string; to: string; payload: Record<string, unknown>; orderId: string | null }
export interface RenderedEmail { subject: string; text: string; html: string; attachments?: Attachment[] }

interface OrderLite { id: string; orderNumber: string; eventId: string; buyerName: string; total: number; status: string }
interface EventLite { id: string; title: string; startAt: Date; venueName: string; timezone?: string; cancelReason?: string | null }
interface TicketLite { id: string; code: string; holderName: string; ticketTypeId: string; status: string; codeVersion: number }

const frontend = () => (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
const rupiah = (amount: number) => `Rp${amount.toLocaleString("id-ID")}`;
const when = (event: EventLite) => new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short", timeZone: event.timezone ?? "Asia/Jakarta" }).format(event.startAt);

// Kerangka HTML tunggal: klien email mengabaikan <style>, jadi gaya inline seminimal mungkin.
function layout(title: string, body: string, action?: { label: string; url: string }): string {
  const button = action ? `<p><a href="${escape(action.url)}" style="display:inline-block;padding:10px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:6px">${escape(action.label)}</a></p><p style="color:#6b7280;font-size:12px">Tautan tidak bisa diklik? Salin: ${escape(action.url)}</p>` : "";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827;max-width:560px;margin:auto"><h2>${escape(title)}</h2>${body}${button}<hr><p style="color:#6b7280;font-size:12px">Email otomatis dari PassGo — jangan dibalas.</p></body></html>`;
}

function simple(subject: string, lines: string[], action?: { label: string; url: string }): RenderedEmail {
  const text = [...lines, ...(action ? ["", `${action.label}: ${action.url}`] : [])].join("\n");
  return { subject, text, html: layout(subject, lines.map((line) => `<p>${escape(line)}</p>`).join(""), action) };
}

async function orderAndEvent(row: OutboxRow): Promise<{ order: OrderLite; event: EventLite }> {
  const orderId = row.orderId ?? String(row.payload.orderId ?? "");
  const order = await Order.findOne({ id: orderId }).lean<OrderLite>();
  if (!order) throw new Error(`order ${orderId} not found`);
  const event = await Event.findOne({ id: order.eventId }).lean<EventLite>();
  if (!event) throw new Error(`event ${order.eventId} not found`);
  return { order, event };
}

// Kode tiket selalu dibaca saat kirim (bukan saat antre), sehingga email ulang memuat kode terkini (§9.8 ticket-email).
async function ticketsEmail(row: OutboxRow, reissued: boolean): Promise<RenderedEmail> {
  const { order, event } = await orderAndEvent(row);
  const filter = reissued ? { id: String(row.payload.ticketId), status: "VALID" } : { orderId: order.id, status: "VALID" };
  const tickets = await Ticket.find(filter).sort({ createdAt: 1 }).lean<TicketLite[]>();
  if (!tickets.length) throw new Error("no VALID tickets to send");
  const typeNames = new Map((await Order.findOne({ id: order.id }, { items: 1 }).lean<{ items: Array<{ ticketTypeId: string; ticketTypeName: string }> }>())?.items.map((item) => [item.ticketTypeId, item.ticketTypeName]) ?? []);
  const attachments: Attachment[] = await Promise.all(tickets.map(async (ticket) => ({ filename: `tiket-${ticket.id}.png`, cid: `qr-${ticket.id}`, contentType: "image/png", content: await toBuffer(qrPayload(ticket.code), { type: "png", errorCorrectionLevel: "M", margin: 2, width: 240 }) })));
  const subject = reissued ? `Kode tiket baru — ${event.title}` : `E-ticket ${event.title} (${order.orderNumber})`;
  const intro = reissued ? "Kode tiket Anda telah diterbitkan ulang. Kode lama tidak berlaku lagi." : `Terima kasih, ${order.buyerName}. Pembayaran pesanan ${order.orderNumber} berhasil.`;
  const detail = `${event.title} — ${when(event)} di ${event.venueName}`;
  const url = `${frontend()}/orders/${order.id}`;
  const text = [intro, detail, "", ...tickets.map((ticket) => `${typeNames.get(ticket.ticketTypeId) ?? "Tiket"} · ${ticket.holderName} · ${formatTicketCode(ticket.code)}`), "", `Lihat tiket: ${url}`].join("\n");
  const cards = tickets.map((ticket) => `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:12px 0"><img src="cid:qr-${ticket.id}" width="200" height="200" alt="QR tiket"><p><b>${escape(typeNames.get(ticket.ticketTypeId) ?? "Tiket")}</b> — ${escape(ticket.holderName)}<br><code style="font-size:16px">${formatTicketCode(ticket.code)}</code></p></div>`).join("");
  return { subject, text, html: layout(subject, `<p>${escape(intro)}</p><p>${escape(detail)}</p>${cards}`, { label: "Lihat tiket", url }), attachments };
}

export async function renderEmail(row: OutboxRow): Promise<RenderedEmail> {
  const token = typeof row.payload.token === "string" ? encodeURIComponent(row.payload.token) : "";
  switch (row.type) {
    case "EMAIL_VERIFICATION":
      return simple("Verifikasi email PassGo", ["Klik tautan di bawah untuk memverifikasi email Anda. Tautan berlaku 24 jam."], { label: "Verifikasi email", url: `${frontend()}/verify-email?token=${token}` });
    case "PASSWORD_RESET":
      return simple("Reset password PassGo", ["Ada permintaan reset password untuk akun ini. Abaikan email ini bila bukan Anda."], { label: "Reset password", url: `${frontend()}/reset-password?token=${token}` });
    case "ACCOUNT_EXISTS":
      return simple("Akun PassGo sudah ada", ["Seseorang mencoba mendaftar dengan email ini, padahal akunnya sudah ada. Lupa password? Reset di tautan berikut."], { label: "Reset password", url: `${frontend()}/forgot-password` });
    case "ORDER_TICKETS":
      return ticketsEmail(row, false);
    case "TICKET_REISSUED":
      return ticketsEmail(row, true);
    case "EVENT_CANCELLED": {
      const { order, event } = await orderAndEvent(row);
      const refund = order.status === "PAID" && order.total > 0 ? "Dana Anda akan dikembalikan oleh penyelenggara; kami akan mengabari bila sudah diproses." : "Tidak ada pembayaran yang perlu dikembalikan.";
      return simple(`Acara dibatalkan: ${event.title}`, [`Acara ${event.title} (${when(event)}) dibatalkan oleh penyelenggara.`, ...(event.cancelReason ? [`Alasan: ${event.cancelReason}`] : []), `Pesanan ${order.orderNumber}: ${refund}`], { label: "Lihat pesanan", url: `${frontend()}/orders/${order.id}` });
    }
    case "REFUND_REQUIRED": {
      const { order, event } = await orderAndEvent(row);
      return simple(`Pembayaran ${order.orderNumber} akan dikembalikan`, [`Pembayaran Anda untuk ${event.title} diterima setelah pesanan kedaluwarsa atau kuota habis, sehingga tiket tidak dapat diterbitkan.`, `Dana ${rupiah(order.total)} akan dikembalikan oleh penyelenggara.`], { label: "Lihat pesanan", url: `${frontend()}/orders/${order.id}` });
    }
    case "ORDER_REFUNDED": {
      const { order, event } = await orderAndEvent(row);
      const amount = typeof row.payload.amount === "number" ? row.payload.amount : order.total;
      return simple(`Refund ${order.orderNumber} selesai`, [`Refund ${rupiah(amount)} untuk ${event.title} telah diproses. Tiket pada pesanan ini tidak berlaku lagi.`], { label: "Lihat pesanan", url: `${frontend()}/orders/${order.id}` });
    }
    default:
      throw new Error(`unknown email type ${row.type}`);
  }
}
