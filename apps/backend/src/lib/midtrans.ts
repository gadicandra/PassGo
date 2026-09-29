import midtransClient from "midtrans-client";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function snapClient(): midtransClient.Snap {
  return new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: required("MIDTRANS_SERVER_KEY"),
    clientKey: required("MIDTRANS_CLIENT_KEY"),
  });
}