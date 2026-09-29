import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { encodePoster } from "../../src/services/event-service";

const image = (width: number, height: number, format: "jpeg" | "png" | "gif") =>
  sharp({ create: { width, height, channels: 3, background: "#182640" } })[format]().toBuffer();

test("poster valid di-reencode ke WebP tanpa metadata", async () => {
  const webp = await encodePoster(await image(900, 1125, "jpeg"));
  const meta = await sharp(webp).metadata();

  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 900);
  assert.equal(meta.height, 1125);
  assert.equal(meta.exif, undefined);
});

test("poster di bawah 600x600 ditolak 422 poster-too-small", async () => {
  const small = await image(599, 900, "png");

  await assert.rejects(() => encodePoster(small), (error: any) => {
    assert.equal(error.status, 422);
    assert.equal(error.code, "poster-too-small");
    return true;
  });
});

test("format di luar JPEG/PNG/WebP ditolak 415", async () => {
  const gif = await image(900, 900, "gif");

  await assert.rejects(() => encodePoster(gif), (error: any) => {
    assert.equal(error.status, 415);
    assert.equal(error.code, "unsupported-media-type");
    return true;
  });
});

test("berkas yang bukan gambar ditolak 415, bukan melempar error sharp", async () => {
  await assert.rejects(() => encodePoster(Buffer.from("ini bukan gambar")), (error: any) => {
    assert.equal(error.status, 415);
    return true;
  });
});
