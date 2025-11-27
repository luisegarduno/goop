/**
 * Masks an API key for safe display in logs or UI.
 * Shows the prefix and suffix while hiding the sensitive middle portion.
 *
 * Examples:
 * - "sk-ant-api03-abc123def456" -> "sk-ant-***...***456"
 * - "sk-proj-abc123def456" -> "sk-proj-***...***456"
 *
 * @param apiKey - The API key to mask
 * @param prefixLength - Number of characters to show at the start (default: 10)
 * @param suffixLength - Number of characters to show at the end (default: 4)
 * @returns Masked API key string
 */
export function maskApiKey(
  apiKey: string | null | undefined,
  prefixLength: number = 10,
  suffixLength: number = 4
): string | null {
  if (!apiKey || typeof apiKey !== "string") {
    return null;
  }

  // Don't mask very short keys (likely invalid anyway)
  if (apiKey.length <= prefixLength + suffixLength) {
    return "***";
  }

  const prefix = apiKey.slice(0, prefixLength);
  const suffix = apiKey.slice(-suffixLength);

  return `${prefix}***...***${suffix}`;
}
