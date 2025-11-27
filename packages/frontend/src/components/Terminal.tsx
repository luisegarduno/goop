import { useEffect, useRef } from "react";
import { useSessionStore } from "../stores/session";

/**
 * Truncates a string to a maximum length, respecting character boundaries.
 * @param str - The string to truncate
 * @param maxLength - Maximum number of characters
 * @returns Truncated string with ellipsis if needed
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function Terminal() {
  const { messages, currentText, currentParts, isStreaming } = useSessionStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentText, currentParts, isStreaming]);

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto p-4 pt-16 pb-24 space-y-4">
      {messages.map((msg) => {
        // Check if this message only contains tool results (no text or tool_use)
        const onlyToolResults = msg.parts.every(part => part.type === "tool_result");

        return (
          <div key={msg.id} className="space-y-2">
            {/* Only show role label if message contains more than just tool results */}
            {!onlyToolResults && (
              <div
                className={`font-bold ${
                  msg.role === "user"
                    ? "text-terminal-user"
                    : "text-terminal-assistant"
                }`}
              >
                {msg.role === "user" ? "❯ User:" : "⟳ Assistant:"}
              </div>
            )}
            {msg.parts.map((part, idx) => (
              <div key={idx} className={onlyToolResults ? "" : "pl-4"}>
                {part.type === "text" && (
                  <div className="whitespace-pre-wrap">{part.text}</div>
                )}
                {part.type === "tool_use" && (
                  <div className="text-terminal-tool">
                    🔧 Using tool: {part.name}
                  </div>
                )}
                {part.type === "tool_result" && (
                  <div className="text-terminal-tool opacity-70">
                    → {truncateString(part.result || "", 200)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
      {isStreaming && (currentParts.length > 0 || currentText) && (
        <div className="space-y-2">
          <div className="font-bold text-terminal-assistant">⟳ Assistant:</div>
          {currentParts.map((part, idx) => (
            <div key={idx} className="pl-4">
              {part.type === "text" && (
                <div className="whitespace-pre-wrap">{part.text}</div>
              )}
              {part.type === "tool_use" && (
                <div className="text-terminal-tool">
                  🔧 Using tool: {part.name}
                </div>
              )}
              {part.type === "tool_result" && (
                <div className="text-terminal-tool opacity-70">
                  → {truncateString(part.result || "", 200)}
                </div>
              )}
            </div>
          ))}
          {currentText && (
            <div className="pl-4 whitespace-pre-wrap">{currentText}</div>
          )}
        </div>
      )}
      {isStreaming && (
        <div className="animate-pulse text-terminal-assistant">▊</div>
      )}
      {/* Invisible element to scroll to */}
      <div ref={bottomRef} />
    </div>
  );
}