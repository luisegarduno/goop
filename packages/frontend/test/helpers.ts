import type { SessionStore } from "../src/stores/session";

/**
 * Creates a mock fetch function for API testing
 */
export function createMockFetch(responses: Record<string, any>) {
  return async (url: string, options?: RequestInit) => {
    const key = `${options?.method || "GET"} ${url}`;
    const response = responses[key];

    if (!response) {
      throw new Error(`No mock response for ${key}`);
    }

    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.data,
      text: async () => JSON.stringify(response.data),
      headers: new Headers(response.headers || {}),
    } as Response;
  };
}

/**
 * Creates a mock ReadableStream for SSE testing
 */
export function createMockSSEStream(
  events: Array<{ type: string; data: any }>
) {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    async pull(controller) {
      if (index >= events.length) {
        controller.close();
        return;
      }

      const event = events[index++];
      const sseData = `data: ${JSON.stringify(event.data)}\n\n`;
      controller.enqueue(encoder.encode(sseData));
    },
  });
}

/**
 * Reset Zustand store to initial state
 */
export function resetStore(store: any) {
  store.setState({
    sessionId: null,
    workingDirectory: null,
    provider: null,
    model: null,
    messages: [],
    isStreaming: false,
    currentText: "",
    currentParts: [],
  });
}

/**
 * Mock localStorage for testing
 */
export class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
