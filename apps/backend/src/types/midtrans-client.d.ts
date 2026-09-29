// @types/midtrans-client tidak mendeklarasikan `snap.transaction`, padahal runtime-nya ada (lib/transaction.js).
import "midtrans-client";

declare module "midtrans-client" {
  interface SnapTransactionApi {
    status(orderId: string): Promise<Record<string, string | undefined>>;
  }
  interface Snap {
    transaction: SnapTransactionApi;
  }
}
