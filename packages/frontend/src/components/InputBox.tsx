import { useState } from "react";
import { useSessionStore } from "../stores/session";

interface InputBoxProps {
  onSend: (message: string) => void;
}

export function InputBox({ onSend }: InputBoxProps) {
  const [input, setInput] = useState("");
  const { isStreaming } = useSessionStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    onSend(input);
    setInput("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-0 left-0 right-0 p-4 bg-terminal-bg border-t border-gray-700"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800 text-terminal-text px-4 py-2 rounded border border-gray-600 focus:outline-none focus:border-terminal-user disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="px-6 py-2 bg-terminal-user text-black rounded font-bold hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </form>
  );
}