import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../src/app";
import { connectDatabase, disconnectDatabase } from "../../src/lib/database";
import { AuthToken, EmailOutbox, RefreshToken, User } from "../../src/models";
import { uuidv7 } from "../../src/utils/uuid";

interface OutboxPayload {
  token: string;
  userId: string;
}

const atlasEnabled = Boolean(process.env.MONGODB_URI && process.env.JWT_ACCESS_SECRET);

test("auth lifecycle works against MongoDB Atlas", { skip: !atlasEnabled }, async () => {
  await connectDatabase();
  const email = `atlas-${uuidv7()}@example.com`;
  const password = "InitialPassword123";
  const replacementPassword = "ReplacementPassword123";
  let userId: string | undefined;

  try {
    const registration = await request(app).post("/api/v1/auth/register").send({ name: "Atlas Auth User", email, password });
    assert.equal(registration.status, 202);

    const user = await User.findOne({ email }).lean<{ id: string; tokenVersion: number }>();
    assert.ok(user);
    userId = user.id;

    const login = await request(app).post("/api/v1/auth/login").send({ email, password });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.tokenType, "Bearer");
    const initialSetCookie = login.headers["set-cookie"]?.[0];
    assert.ok(initialSetCookie);
    const initialCookie = initialSetCookie.split(";", 1)[0];

    const refresh = await request(app).post("/api/v1/auth/refresh")
      .set("Origin", process.env.CSRF_ALLOWED_ORIGINS?.split(",")[0] ?? "http://localhost:3001")
      .set("X-Requested-With", "fetch")
      .set("Cookie", initialCookie);
    assert.equal(refresh.status, 200);
    assert.ok(refresh.headers["set-cookie"]?.[0]);

    const reused = await request(app).post("/api/v1/auth/refresh")
      .set("Origin", process.env.CSRF_ALLOWED_ORIGINS?.split(",")[0] ?? "http://localhost:3001")
      .set("X-Requested-With", "fetch")
      .set("Cookie", initialCookie);
    assert.equal(reused.status, 401);
    assert.equal(reused.body.code, "refresh-token-reused");

    const verificationOutbox = await EmailOutbox.findOne({ to: email, type: "EMAIL_VERIFICATION" }).sort({ createdAt: -1 }).lean<{ payload: OutboxPayload }>();
    assert.ok(verificationOutbox);
    const verification = await request(app).post("/api/v1/auth/email-verification/confirm").send({ token: verificationOutbox.payload.token });
    assert.equal(verification.status, 204);

    const verifiedLogin = await request(app).post("/api/v1/auth/login").send({ email, password });
    assert.equal(verifiedLogin.status, 200);
    assert.equal(verifiedLogin.body.data.user.emailVerified, true);

    const resetRequest = await request(app).post("/api/v1/auth/password-reset").send({ email });
    assert.equal(resetRequest.status, 202);
    const resetOutbox = await EmailOutbox.findOne({ to: email, type: "PASSWORD_RESET" }).sort({ createdAt: -1 }).lean<{ payload: OutboxPayload }>();
    assert.ok(resetOutbox);
    const reset = await request(app).post("/api/v1/auth/password-reset/confirm").send({ token: resetOutbox.payload.token, newPassword: replacementPassword });
    assert.equal(reset.status, 204);

    const newLogin = await request(app).post("/api/v1/auth/login").send({ email, password: replacementPassword });
    assert.equal(newLogin.status, 200);
  } finally {
    if (userId) {
      await Promise.all([
        User.deleteOne({ id: userId }),
        RefreshToken.deleteMany({ userId }),
        AuthToken.deleteMany({ userId }),
        EmailOutbox.deleteMany({ to: email }),
      ]);
    }
    await disconnectDatabase();
    await mongoose.connection.close();
  }
});