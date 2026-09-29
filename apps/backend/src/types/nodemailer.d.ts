// nodemailer 7 tidak membawa .d.ts; cukup permukaan yang dipakai email-service.
declare module "nodemailer" {
  interface Attachment { filename?: string; content?: Buffer | string; cid?: string; contentType?: string }
  interface MailOptions { from?: string; to: string; subject: string; text?: string; html?: string; attachments?: Attachment[] }
  interface SentMessageInfo { messageId: string; accepted: string[]; rejected: string[]; response: string }
  interface TransportOptions { host?: string; port?: number; secure?: boolean; auth?: { user: string; pass: string } }
  interface Transporter { sendMail(options: MailOptions): Promise<SentMessageInfo>; verify(): Promise<true> }
  function createTransport(options: TransportOptions): Transporter;
  const nodemailer: { createTransport: typeof createTransport };
  export { Attachment, MailOptions, SentMessageInfo, Transporter, TransportOptions, createTransport };
  export default nodemailer;
}
