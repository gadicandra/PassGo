import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { cancelOrder, createOrder, getOrder, listOrders } from "../services/order-service";

const router = Router();
const orderBody = z.object({
  eventId: z.string().uuid(),
  items: z.array(z.object({ ticketTypeId: z.string().uuid(), quantity: z.number().int().min(1), expectedUnitPrice: z.number().int().nonnegative() }).strict()).min(1).max(10),
  buyerPhone: z.string().nullable().optional(),
}).strict().superRefine((body, context) => {
  const ids = body.items.map((item) => item.ticketTypeId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "ticketTypeId tidak boleh duplikat." });
  }
});
const cancelBody = z.object({ reason: z.string().trim().max(500).optional() }).strict();

router.use(authenticate);

router.post("/", async (request, response, next) => {
  try { response.status(201).json({ data: await createOrder((request as AuthenticatedRequest).user.sub, orderBody.parse(request.body)) }); } catch (error) { next(error); }
});

router.get("/", async (request, response, next) => {
  try { response.json({ data: await listOrders((request as AuthenticatedRequest).user.sub) }); } catch (error) { next(error); }
});

router.get("/:orderId", async (request, response, next) => {
  try { response.json({ data: await getOrder((request as unknown as AuthenticatedRequest).user.sub, request.params.orderId) }); } catch (error) { next(error); }
});

router.post("/:orderId/cancel", async (request, response, next) => {
  try { const body = cancelBody.parse(request.body); response.json({ data: await cancelOrder((request as unknown as AuthenticatedRequest).user.sub, request.params.orderId, body.reason) }); } catch (error) { next(error); }
});

export default router;