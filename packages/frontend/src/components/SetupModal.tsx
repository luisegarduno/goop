import { useState } from "react";

interface SetupModalProps {
  onComplete: (workingDirectory: string, title: string) => void;
}

export function SetupModal({ onComplete }: SetupModalProps) {
  const [workingDirectory, setWorkingDirectory] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/home"
  );
  const [title, setTitle] = useState("New Conversation");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (workingDirectory.trim() && title.trim()) {
      onComplete(workingDirectory.trim(), title.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-cyan-400 mb-4">
          New Session Setup
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="sessionTitle"
              className="block text-gray-300 mb-2 text-sm"
            >
              Session Title:
            </label>
            <input
              id="sessionTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-cyan-500"
              placeholder="New Conversation"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="workingDir"
              className="block text-gray-300 mb-2 text-sm"
            >
              Working Directory:
            </label>
            <input
              id="workingDir"
              type="text"
              value={workingDirectory}
              onChange={(e) => setWorkingDirectory(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 font-mono focus:outline-none focus:border-cyan-500"
              placeholder="/home/user/project"
            />
            <p className="text-gray-500 text-xs mt-2">
              The root directory where the AI can read files.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition-colors"
            >
              Start Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
