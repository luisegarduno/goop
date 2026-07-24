import { useState, useEffect, useRef, useCallback } from "react";
import { getContextUsage, type ContextUsageResponse } from "../api/client";
import { useSessionStore } from "../stores/session";
import { formatTokens, formatPercent } from "../utils/format";

// Colored square per category, mirroring the mockup's legend.
const CATEGORY_COLORS: Record<string, string> = {
  "System prompt": "bg-sky-500",
  Tools: "bg-blue-500",
  Messages: "bg-emerald-500",
  "Free space": "bg-zinc-600",
};

function categoryColor(label: string): string {
  return CATEGORY_COLORS[label] ?? "bg-zinc-500";
}

/**
 * Compact top-bar pill showing context-window usage for the current session,
 * expanding into an itemized breakdown on click. Only meaningful for the
 * `anthropic` provider; renders nothing when usage is unavailable.
 */
export function ContextUsageIndicator() {
  const { sessionId, provider, isStreaming } = useSessionStore();
  const [usage, setUsage] = useState<ContextUsageResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wasStreaming = useRef(isStreaming);

  const isSupportedProvider =
    provider === "anthropic" || provider === "claude-code";

  const fetchUsage = useCallback(async () => {
    if (!sessionId || !isSupportedProvider) {
      setUsage(null);
      return;
    }
    try {
      const result = await getContextUsage(sessionId);
      setUsage(result);
    } catch (error) {
      console.error("Failed to fetch context usage:", error);
      setUsage(null);
    }
  }, [sessionId, provider]);

  // Fetch on session/provider change.
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Refetch after a turn completes (streaming true -> false), since the
  // conversation just grew.
  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      fetchUsage();
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, fetchUsage]);

  // Refresh when the panel is opened.
  useEffect(() => {
    if (isOpen) {
      fetchUsage();
    }
  }, [isOpen, fetchUsage]);

  // Close on outside click.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Nothing to show for unsupported providers or before the first fetch.
  if (
    !isSupportedProvider ||
    !usage ||
    !usage.supported ||
    usage.totalTokens === undefined ||
    usage.contextWindow === undefined ||
    usage.usedPercent === undefined
  ) {
    return null;
  }

  const { totalTokens, contextWindow, usedPercent, categories = [] } = usage;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-md border transition-colors flex items-center gap-2 ${
          isOpen
            ? "bg-blue-600 hover:bg-blue-700 border-blue-700 text-white"
            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
        }`}
        title="Context window usage"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Context window usage"
      >
        {/* Gauge icon */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.488 9A9.004 9.004 0 0015 3.512V9h5.488z"
          />
        </svg>
        <span className="text-xs font-mono tabular-nums">
          {formatTokens(totalTokens)}/{formatTokens(contextWindow)} (
          {formatPercent(usedPercent)})
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg z-50"
          role="dialog"
          aria-label="Context window breakdown"
        >
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">
              Context window
            </span>
            <span className="text-xs font-mono text-zinc-400 tabular-nums">
              {formatTokens(totalTokens)} / {formatTokens(contextWindow)} (
              {formatPercent(usedPercent)})
            </span>
          </div>

          {/* Stacked usage bar */}
          <div className="px-4 pt-3">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              {categories.map((cat) => (
                <div
                  key={cat.label}
                  className={categoryColor(cat.label)}
                  style={{ width: `${Math.max(0, cat.percent * 100)}%` }}
                  title={`${cat.label}: ${formatTokens(cat.tokens)}`}
                />
              ))}
            </div>
          </div>

          <div className="py-2">
            {categories.map((cat) => (
              <div
                key={cat.label}
                className="flex items-center gap-3 px-4 py-1.5 text-sm"
              >
                <span
                  className={`inline-block w-3 h-3 rounded-sm flex-shrink-0 ${categoryColor(
                    cat.label
                  )}`}
                  aria-hidden="true"
                />
                <span className="flex-1 text-zinc-300 truncate">
                  {cat.label}
                </span>
                <span className="font-mono text-zinc-200 tabular-nums">
                  {formatTokens(cat.tokens)}
                </span>
                <span className="font-mono text-zinc-500 tabular-nums w-10 text-right">
                  {formatPercent(cat.percent)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
