import { useState, useEffect, useRef } from "react";
import { getAllSessions, getMessages } from "../api/client";
import type { SessionInfo } from "../api/client";
import { useSessionStore } from "../stores/session";

export function SessionSwitcher() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { sessionId, loadSession } = useSessionStore();

  useEffect(() => {
    // Fetch sessions when component mounts
    const fetchSessions = async () => {
      try {
        const allSessions = await getAllSessions();
        setSessions(allSessions);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSessionSelect = async (session: SessionInfo) => {
    if (session.id === sessionId) {
      // Already on this session
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch messages for the selected session
      const messages = await getMessages(session.id);

      // Load the session into the store
      loadSession(session.id, session.workingDirectory, messages);

      if (import.meta.env.DEV) {
        console.log(`Switched to session "${session.title}" (${session.id})`);
      }

      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch session:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Normalize both dates to start of day in local timezone for accurate day comparison
    const startOfDayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOfDayNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate difference in calendar days
    const diffMs = startOfDayNow.getTime() - startOfDayDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 transition-colors flex items-center gap-2"
        disabled={loading}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="text-sm">Sessions</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
          {sessions.length === 0 ? (
            <div className="px-4 py-3 text-zinc-500 text-sm">No sessions found</div>
          ) : (
            <div className="py-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSessionSelect(session)}
                  className={`w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0 ${
                    session.id === sessionId ? 'bg-zinc-800' : ''
                  }`}
                  disabled={loading}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-200 truncate">
                        {session.title}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 truncate">
                        {session.workingDirectory}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 whitespace-nowrap">
                      {formatDate(session.updatedAt)}
                    </div>
                  </div>
                  {session.id === sessionId && (
                    <div className="text-xs text-green-500 mt-1">● Active</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
