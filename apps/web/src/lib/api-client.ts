import type { MessageSource, StreamEvent, StreamDoneEvent } from "@corpusai/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Re-export types for backward compatibility
export type { MessageSource } from "@corpusai/types";
export type StreamDoneData = StreamDoneEvent["data"];

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      data.message || `HTTP ${response.status}`,
      data
    );
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text) as T;
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<T>(response);
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    return handleResponse<T>(response);
  },

  /**
   * Stream a message response using Server-Sent Events.
   * Returns an AbortController to cancel the stream if needed.
   */
  streamMessage(
    conversationId: string,
    content: string,
    callbacks: {
      onToken: (token: string) => void;
      onSources: (sources: MessageSource[]) => void;
      onDone: (data: StreamDoneData) => void;
      onError: (error: Error) => void;
    }
  ): AbortController {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(
          `${API_URL}/chat/conversations/${conversationId}/messages/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ content }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new ApiError(
            response.status,
            data.message || `HTTP ${response.status}`,
            data
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6)) as StreamEvent;

                switch (event.type) {
                  case "token":
                    callbacks.onToken((event.data as { token: string }).token);
                    break;
                  case "sources":
                    callbacks.onSources((event.data as { sources: MessageSource[] }).sources);
                    break;
                  case "done":
                    callbacks.onDone(event.data as StreamDoneData);
                    break;
                  case "error":
                    callbacks.onError(new Error((event.data as { message: string }).message));
                    break;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          callbacks.onError(error instanceof Error ? error : new Error("Unknown error"));
        }
      }
    })();

    return controller;
  },
};

export { API_URL };
