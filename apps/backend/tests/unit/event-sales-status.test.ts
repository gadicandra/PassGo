import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateSalesStatus } from "../../src/services/event-service";

test("salesStatus agregat mengikuti prioritas §4", () => {
  assert.equal(aggregateSalesStatus(["SOLD_OUT", "ON_SALE"], "PUBLISHED"), "ON_SALE");
  assert.equal(aggregateSalesStatus(["ENDED", "UPCOMING"], "PUBLISHED"), "UPCOMING");
  assert.equal(aggregateSalesStatus(["SOLD_OUT", "SOLD_OUT"], "PUBLISHED"), "SOLD_OUT");
  assert.equal(aggregateSalesStatus(["SOLD_OUT", "ENDED"], "PUBLISHED"), "ENDED");
  assert.equal(aggregateSalesStatus([], "PUBLISHED"), "ENDED");
  assert.equal(aggregateSalesStatus(["ON_SALE"], "CANCELLED"), "ENDED");
});
