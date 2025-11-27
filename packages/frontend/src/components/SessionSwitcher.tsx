import { useState, useEffect, useRef, useCallback } from "react";
import { getAllSessions, getMessages } from "../api/client";
import type { SessionInfo } from "../api/client";
import { useSessionStore } from "../stores/session";

export function SessionSwitcher() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sessionButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { sessionId, loadSession } = useSessionStore();

  const fetchSessions = useCallback(async () => {
    try {
      const allSessions = await getAllSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  }, []);

  useEffect(() => {
    // Fetch sessions when dropdown is opened to ensure fresh data
    // This handles the stale data issue when switching sessions or after updates
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  // Initial fetch on mount for faster perceived loading
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Focus session button when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && focusedIndex < sessions.length) {
      sessionButtonRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, isOpen, sessions.length]);

  const handleButtonKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Open dropdown with arrow down, Enter, or Space when closed
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
      if (sessions.length > 0) {
        setFocusedIndex(0);
      }
    }
  }, [sessions.length]);

  const handleDropdownKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((prev) => 
          prev < sessions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < sessions.length) {
          handleSessionSelect(sessions[focusedIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case "Tab":
        // Allow default tab behavior to move focus out of dropdown
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case "Home":
        event.preventDefault();
        if (sessions.length > 0) {
          setFocusedIndex(0);
        }
        break;
      case "End":
        event.preventDefault();
        if (sessions.length > 0) {
          setFocusedIndex(sessions.length - 1);
        }
        break;
    }
  }, [isOpen, sessions, focusedIndex]);

  const handleSessionSelect = async (session: SessionInfo) => {
    if (session.id === sessionId) {
      // Already on this session
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null); // Clear any previous error
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
      setError("Failed to switch session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

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
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={!isOpen ? handleButtonKeyDown : undefined}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 transition-colors flex items-center gap-2"
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select session"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="text-sm">Sessions</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-96 overflow-y-auto z-50"
          role="listbox"
          aria-label="Sessions list"
          aria-activedescendant={focusedIndex >= 0 ? `session-${sessions[focusedIndex]?.id}` : undefined}
          onKeyDown={handleDropdownKeyDown}
        >
        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
          {error && (
            <div className="px-4 py-3 bg-red-900/50 border-b border-red-700 text-red-200 text-sm flex items-center justify-between gap-2">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-100 transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {sessions.length === 0 ? (
            <div className="px-4 py-3 text-zinc-500 text-sm" role="option" aria-disabled="true">No sessions found</div>
          ) : (
            <div className="py-1">
              {sessions.map((session, index) => (
                <button
                  key={session.id}
                  id={`session-${session.id}`}
                  ref={(el) => { sessionButtonRefs.current[index] = el; }}
                  onClick={() => handleSessionSelect(session)}
                  onKeyDown={handleDropdownKeyDown}
                  className={`w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0 ${
                    session.id === sessionId ? 'bg-zinc-800' : ''
                  } ${focusedIndex === index ? 'outline outline-2 outline-cyan-500 outline-offset-[-2px]' : ''}`}
                  disabled={loading}
                  role="option"
                  aria-selected={session.id === sessionId}
                  tabIndex={focusedIndex === index ? 0 : -1}
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
