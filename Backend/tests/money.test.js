import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  paiseToRupees,
  rupeesToPaise,
  formatPaise,
  assertPaise,
} from "../utils/money.js";

/**
 * All monetary math is done in integer paise. These tests lock the
 * conversion and validation helpers so a regression can't reintroduce
 * floating-point drift into the money path.
 */

describe("money", () => {
  it("paiseToRupees converts integer paise to a 2-decimal rupee number", () => {
    assert.equal(paiseToRupees(0), 0);
    assert.equal(paiseToRupees(123456), 1234.56);
    assert.equal(paiseToRupees(1), 0.01);
  });

  it("paiseToRupees returns 0 for non-finite input", () => {
    assert.equal(paiseToRupees(NaN), 0);
    assert.equal(paiseToRupees(undefined), 0);
    assert.equal(paiseToRupees(null), 0);
  });

  it("rupeesToPaise rounds correctly at .5", () => {
    assert.equal(rupeesToPaise(12.345), 1235); // 1234.5 → 1235
    assert.equal(rupeesToPaise(0.01), 1);
    assert.equal(rupeesToPaise(1000), 100000);
  });

  it("formatPaise renders Indian currency correctly", () => {
    const formatted = formatPaise(1234567890);
    // Result should contain the ₹ symbol and Indian grouping
    assert.match(formatted, /₹/);
    assert.match(formatted, /1,23,45,678\.90/);
  });

  it("assertPaise accepts positive integers", () => {
    assert.equal(assertPaise(1), 1);
    assert.equal(assertPaise(999_999_999), 999_999_999);
  });

  it("assertPaise rejects floats", () => {
    assert.throws(() => assertPaise(1.5), /integer paise/);
  });

  it("assertPaise rejects negatives", () => {
    assert.throws(() => assertPaise(-1), /positive paise/);
  });

  it("assertPaise rejects zero by default", () => {
    assert.throws(() => assertPaise(0), /positive paise/);
  });

  it("assertPaise allows zero when allowZero is true", () => {
    assert.equal(assertPaise(0, { allowZero: true }), 0);
  });

  it("assertPaise rejects non-finite values", () => {
    assert.throws(() => assertPaise(NaN), /integer paise/);
    assert.throws(() => assertPaise(Infinity), /integer paise/);
  });
});