declare module "qrcode" {
  interface QRCodeToBufferOptions { type?: "png"; errorCorrectionLevel?: "L" | "M" | "Q" | "H"; margin?: number; width?: number }
  export function toBuffer(text: string, options?: QRCodeToBufferOptions): Promise<Buffer>;
}
