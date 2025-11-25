import { useSessionStore } from "../stores/session";

export function Terminal() {
  const { messages, currentText, currentParts, isStreaming } = useSessionStore();

  return (
    <div className="h-screen overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className="space-y-2">
          <div
            className={`font-bold ${
              msg.role === "user"
                ? "text-terminal-user"
                : "text-terminal-assistant"
            }`}
          >
            {msg.role === "user" ? "❯ User:" : "⟳ Assistant:"}
          </div>
          {msg.parts.map((part, idx) => (
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
                  → {part.result?.substring(0, 100)}...
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
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
                  → {part.result?.substring(0, 100)}...
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
    </div>
  );
}