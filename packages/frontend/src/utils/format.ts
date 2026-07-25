/**
 * Format a token count compactly: 706 -> "706", 56_700 -> "56.7k",
 * 1_000_000 -> "1.0M". Mirrors the context-window display in the mockup.
 */
export function formatTokens(n: number): string {
  const value = Math.max(0, Math.round(n));
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return `${value}`;
}

/** Format a fraction (0..1) as a whole-number percentage, e.g. 0.06 -> "6%". */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
