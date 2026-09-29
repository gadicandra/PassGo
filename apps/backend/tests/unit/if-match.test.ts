import assert from "node:assert/strict";
import test from "node:test";
import { assertVersion, ifMatchVersion } from "../../src/utils/if-match";
import { AppError } from "../../src/utils/app-error";

const statusOf = (fn: () => unknown) => { try { fn(); } catch (error) { return (error as AppError).status; } return 200; };

test("If-Match tidak ada atau * → 428", () => {
  assert.equal(statusOf(() => ifMatchVersion(undefined)), 428);
  assert.equal(statusOf(() => ifMatchVersion("*")), 428);
});

test("If-Match weak atau malformed → 412 (strong comparison tidak pernah cocok)", () => {
  for (const header of ['W/"3"', "3", '"abc"']) assert.equal(statusOf(() => assertVersion(ifMatchVersion(header), 3, { version: 3 })), 412);
});

test("versi basi → 412 dengan current; versi cocok lolos", () => {
  try { assertVersion(ifMatchVersion('"2"'), 3, { version: 3 }); assert.fail("harus 412"); } catch (error) {
    assert.equal((error as AppError).status, 412);
    assert.deepEqual((error as AppError).extra, { current: { version: 3 } });
  }
  assert.equal(statusOf(() => assertVersion(ifMatchVersion('"3"'), 3, {})), 200);
});
