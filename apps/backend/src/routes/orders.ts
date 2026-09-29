import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { cancelOrder, createOrder, getOrder, listOrders } from "../services/order-service";
import { runIdempotent } from "../services/idempotency-service";

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
  try {
    const input = orderBody.parse(request.body);
    const result = await runIdempotent({ userId: (request as AuthenticatedRequest).user.sub, method: request.method, path: request.baseUrl + request.path, keyHeader: request.get("idempotency-key"), body: input, handler: async () => ({ status: 201, body: { data: await createOrder((request as AuthenticatedRequest).user.sub, input) } }) });
    for (const [name, value] of Object.entries(result.headers)) response.set(name, value);
    const orderId = (result.body as { data?: { id?: string } }).data?.id;
    if (result.status === 201 && orderId) response.location(`/api/v1/orders/${orderId}`);
    response.status(result.status).json(result.body);
  } catch (error) { next(error); }
});

router.get("/", async (request, response, next) => {
  try { const user = (request as AuthenticatedRequest).user; response.json({ data: await listOrders(user.sub, user.role) }); } catch (error) { next(error); }
});

router.get("/:orderId", async (request, response, next) => {
  try { const user = (request as unknown as AuthenticatedRequest).user; response.json({ data: await getOrder(user.sub, user.role, request.params.orderId) }); } catch (error) { next(error); }
});

router.post("/:orderId/cancel", async (request, response, next) => {
  try { const body = cancelBody.parse(request.body); const user = (request as unknown as AuthenticatedRequest).user; response.json({ data: await cancelOrder(user.sub, user.role, request.params.orderId, body.reason) }); } catch (error) { next(error); }
});

export default router;