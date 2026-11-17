import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";
import { connectDatabase, disconnectDatabase } from "../../src/lib/database";
import { RefreshToken, User } from "../../src/models";
import { uuidv7 } from "../../src/utils/uuid";

// Kontrak §2.3 grace period. Butuh MongoDB (MONGODB_URI) karena logikanya di query rotasi.
const enabled = Boolean(process.env.MONGODB_URI && process.env.JWT_ACCESS_SECRET);
const origin = () => process.env.CSRF_ALLOWED_ORIGINS?.split(",")[0] ?? "http://localhost:3001";
const refresh = (cookie: string) => request(app).post("/api/v1/auth/refresh").set("Origin", origin()).set("X-Requested-With", "fetch").set("Cookie", cookie);
const cookieOf = (response: request.Response) => String(response.headers["set-cookie"]?.[0] ?? "").split(";", 1)[0];

test("refresh: token sebelumnya diterima dalam 10 detik (Set-Cookie hilang saat pindah halaman); di luar itu reuse mencabut family", { skip: !enabled }, async () => {
  await connectDatabase();
  const email = `grace-${uuidv7()}@example.com`;
  const password = "GracePassword123";
  try {
    assert.equal((await request(app).post("/api/v1/auth/register").send({ name: "Grace User", email, password })).status, 202);
    const login = await request(app).post("/api/v1/auth/login").send({ email, password });
    assert.equal(login.status, 200);
    const original = cookieOf(login);

    // Refresh pertama berhasil di server, tapi browser tidak menerima cookie barunya (navigasi memutus response).
    assert.equal((await refresh(original)).status, 200);

    // Browser masih membawa token lama → grace: sesi berlanjut dengan token baru.
    const retry = await refresh(original);
    assert.equal(retry.status, 200, JSON.stringify(retry.body));
    const current = cookieOf(retry);
    const next = await refresh(current);
    assert.equal(next.status, 200, "rantai normal berlanjut dari token hasil grace");

    // Lewat jendela grace: jadikan semua rotasi seolah terjadi 1 menit lalu.
    const user = await User.findOne({ email }).lean<{ id: string }>();
    await RefreshToken.updateMany({ userId: user!.id, replacedById: { $ne: null } }, { $set: { revokedAt: new Date(Date.now() - 60_000) } });
    const reused = await refresh(original);
    assert.equal(reused.status, 401);
    assert.equal(reused.body.code, "refresh-token-reused");
    assert.equal((await refresh(cookieOf(next))).status, 401, "seluruh family dicabut setelah reuse");
  } finally {
    const user = await User.findOne({ email }).lean<{ id: string }>();
    if (user) await Promise.all([User.deleteOne({ id: user.id }), RefreshToken.deleteMany({ userId: user.id })]);
    await disconnectDatabase();
  }
});
