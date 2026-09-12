import { describe, it, expect } from "vitest";
import {
  RATE_CACHE_DURATION,
  calcSpread,
  calcBtcAmount,
  calcSats,
  isRateStale,
  getFriendlyErrorMessage,
  isPositiveNumber,
} from "./calc.js";

describe("calcSpread", () => {
  it("matches the worked example from CLAUDE.md", () => {
    expect(calcSpread(272000, 259498)).toBeCloseTo(4.82, 2);
  });

  it("returns 0 when market rate is 0", () => {
    expect(calcSpread(272000, 0)).toBe(0);
  });

  it("is negative when office rate is below market rate", () => {
    expect(calcSpread(250000, 260000)).toBeLessThan(0);
  });
});

describe("calcBtcAmount", () => {
  it("divides GEL amount by office rate", () => {
    expect(calcBtcAmount(1000, 272000)).toBeCloseTo(1000 / 272000, 10);
  });

  it("returns 0 when office rate is 0", () => {
    expect(calcBtcAmount(1000, 0)).toBe(0);
  });
});

describe("calcSats", () => {
  it("converts BTC to satoshis, truncating fractional sats", () => {
    expect(calcSats(1)).toBe(100000000);
    expect(calcSats(0.000000015)).toBe(1);
    expect(calcSats(0.0000000049)).toBe(0);
  });
});

describe("isRateStale", () => {
  it("is false right after caching", () => {
    const now = Date.now();
    expect(isRateStale(now, now)).toBe(false);
  });

  it("is false just before the cache duration elapses", () => {
    const now = Date.now();
    expect(isRateStale(now - (RATE_CACHE_DURATION - 1), now)).toBe(false);
  });

  it("is true once the cache duration has elapsed", () => {
    const now = Date.now();
    expect(isRateStale(now - (RATE_CACHE_DURATION + 1), now)).toBe(true);
  });
});

describe("getFriendlyErrorMessage", () => {
  it("reports API rate limiting", () => {
    expect(getFriendlyErrorMessage("API rate limit exceeded", 60000)).toContain(
      "API лимит",
    );
  });

  it("reports a slow connection on timeout/abort", () => {
    expect(getFriendlyErrorMessage("AbortError", 60000)).toContain(
      "медленное соединение",
    );
  });

  it("falls back to a generic offline message", () => {
    expect(getFriendlyErrorMessage("Failed to fetch", 60000)).toContain(
      "нет связи",
    );
  });

  it("includes the cache age in minutes", () => {
    expect(getFriendlyErrorMessage("Failed to fetch", 180000)).toContain("3");
  });
});

describe("isPositiveNumber", () => {
  it("accepts positive numbers", () => {
    expect(isPositiveNumber(1000)).toBe(true);
  });

  it("rejects zero, negatives and NaN", () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-5)).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
  });
});
