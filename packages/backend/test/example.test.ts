import { describe, test, expect } from "bun:test";

describe("Example Test", () => {
  test("basic assertion works", () => {
    expect(1 + 1).toBe(2);
  });

  test("async test works", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
