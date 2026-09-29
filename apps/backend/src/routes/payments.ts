import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { settleOrder } from "../services/order-service";
import { AppError } from "../utils/app-error";

const router = Router();
const notification = z.object({ order_id: z.string(), status_code: z.string(), gross_amount: z.string(), signature_key: z.string(), transaction_status: z.string(), transaction_id: z.string().optional(), payment_type: z.string().optional(), fraud_status: z.string().optional() }).passthrough();

router.post("/midtrans/notifications", async (request, response, next) => {
  try {
    const body = notification.parse(request.body);
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) throw new AppError(503, "service-unavailable", "Payment gateway belum dikonfigurasi.");
    const expected = createHash("sha512").update(body.order_id + body.status_code + body.gross_amount + serverKey).digest("hex");
    const actual = Buffer.from(body.signature_key, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) throw new AppError(403, "webhook-signature-invalid", "Signature Midtrans tidak valid.");
    if (["settlement", "capture"].includes(body.transaction_status) && (body.transaction_status !== "capture" || body.fraud_status === "accept" || body.fraud_status === undefined)) await settleOrder(body.order_id, { transactionId: body.transaction_id, paymentType: body.payment_type, providerStatus: body.transaction_status });
    response.json({ data: { received: true } });
  } catch (error) { next(error); }
});

export default router;