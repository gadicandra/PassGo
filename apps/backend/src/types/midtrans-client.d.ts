// midtrans-client tidak menyertakan type definition dan tidak ada @types/midtrans-client.
// Dideklarasikan seperlunya saja: hanya Snap.createTransaction yang dipakai.
declare namespace midtransClient {
  interface SnapTransactionParameters {
    transaction_details: { order_id: string; gross_amount: number };
    [key: string]: unknown;
  }

  interface SnapTransaction {
    token: string;
    redirect_url: string;
  }

  class Snap {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey: string });
    createTransaction(parameters: SnapTransactionParameters): Promise<SnapTransaction>;
  }
}

declare module "midtrans-client" {
  export = midtransClient;
}
