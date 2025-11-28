import { describe, test, expect } from "bun:test";
import { maskApiKey } from "./security";

describe("maskApiKey", () => {
  test("masks long API key correctly", () => {
    const key = "sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz";
    const masked = maskApiKey(key);

    expect(masked).toBe("sk-ant-api***...***wxyz");
  });

  test("masks with custom prefix and suffix lengths", () => {
    const key = "sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz";
    const masked = maskApiKey(key, 5, 3);

    expect(masked).toBe("sk-an***...***xyz");
  });

  test("returns *** for short keys", () => {
    const key = "short";
    const masked = maskApiKey(key);

    expect(masked).toBe("***");
  });

  test("returns null for null input", () => {
    const masked = maskApiKey(null);

    expect(masked).toBeNull();
  });

  test("returns null for undefined input", () => {
    const masked = maskApiKey(undefined);

    expect(masked).toBeNull();
  });

  test("returns null for non-string input", () => {
    const masked = maskApiKey(12345 as any);

    expect(masked).toBeNull();
  });

  test("returns null for empty string", () => {
    const masked = maskApiKey("");

    expect(masked).toBeNull();
  });

  test("handles key with exact minimum length", () => {
    // Default: prefixLength=10, suffixLength=4 -> min length = 14
    const key = "12345678901234"; // exactly 14 chars
    const masked = maskApiKey(key);

    expect(masked).toBe("***");
  });

  test("handles key with minimum length + 1", () => {
    const key = "123456789012345"; // 15 chars (14 + 1)
    const masked = maskApiKey(key);

    expect(masked).toBe("1234567890***...***2345");
  });
});
