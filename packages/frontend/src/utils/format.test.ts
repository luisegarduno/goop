import { describe, test, expect } from "bun:test";
import { formatTokens, formatPercent } from "./format";

describe("formatTokens", () => {
  test("formats small counts as-is", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(706)).toBe("706");
    expect(formatTokens(999)).toBe("999");
  });

  test("formats thousands with a 'k' suffix and one decimal", () => {
    expect(formatTokens(1_000)).toBe("1.0k");
    expect(formatTokens(16_500)).toBe("16.5k");
    expect(formatTokens(56_700)).toBe("56.7k");
  });

  test("formats millions with an 'M' suffix and one decimal", () => {
    expect(formatTokens(1_000_000)).toBe("1.0M");
    expect(formatTokens(1_250_000)).toBe("1.3M");
  });

  test("clamps negatives to zero", () => {
    expect(formatTokens(-5)).toBe("0");
  });
});

describe("formatPercent", () => {
  test("rounds a fraction to a whole-number percentage", () => {
    expect(formatPercent(0.06)).toBe("6%");
    expect(formatPercent(0.9433)).toBe("94%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });
});
