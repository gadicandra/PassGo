// Self-check tanpa framework (dari apps/frontend): npx tsx src/lib/format.check.mts
// Label "Hari ini"/"Besok"/"N hari lagi" dihitung per tanggal WIB, termasuk batas tengah malam.
import assert from "node:assert/strict";
import { daysUntilLabel } from "./format";
const now = new Date("2026-11-17T16:30:00Z"); // 23.30 WIB, 17 Nov
assert.equal(daysUntilLabel("2026-11-17T17:30:00Z", "Asia/Jakarta", now), "Besok"); // 00.30 WIB 18 Nov
assert.equal(daysUntilLabel("2026-11-17T10:00:00Z", "Asia/Jakarta", now), "Hari ini");
assert.equal(daysUntilLabel("2026-11-20T03:00:00Z", "Asia/Jakarta", now), "3 hari lagi");
assert.equal(daysUntilLabel("2026-11-30T03:00:00Z", "Asia/Jakarta", now), "13 hari lagi");
assert.equal(daysUntilLabel("2026-12-05T03:00:00Z", "Asia/Jakarta", now), null);
assert.equal(daysUntilLabel("2026-11-10T03:00:00Z", "Asia/Jakarta", now), null);
console.log("daysUntilLabel ok");
