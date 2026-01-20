import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type MessageSource, type StreamDoneData } from "../api-client";
import type { Message, SendMessageResponse } from "./types";
import { conversationKeys } from "./use-conversations";

export const messageKeys = {
  all: ["messages"] as const,
  lists: () => [...messageKeys.all, "list"] as const,
  listByConversation: (conversationId: string) =>
    [...messageKeys.lists(), { conversationId }] as const,
};

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: messageKeys.listByConversation(conversationId || ""),
    queryFn: () =>
      apiClient.get<Message[]>(`/chat/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}

interface SendMessageInput {
  conversationId: string;
  content: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, content }: SendMessageInput) =>
      apiClient.post<SendMessageResponse>(
        `/chat/conversations/${conversationId}/messages`,
        { content }
      ),
    onSuccess: (data, variables) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: messageKeys.listByConversation(variables.conversationId),
      });
      // Invalidate conversations list (to update lastMessage, messageCount)
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  });
}

/**
 * Hook for sending messages with streaming response.
 */
export function useSendMessageStream() {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState("");
  const [streamingSources, setStreamingSources] = React.useState<MessageSource[]>([]);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const sendStream = React.useCallback(
    (
      conversationId: string,
      content: string,
      callbacks?: {
        onToken?: (token: string, fullContent: string) => void;
        onSources?: (sources: MessageSource[]) => void;
        onDone?: (data: StreamDoneData) => void;
        onError?: (error: Error) => void;
      }
    ) => {
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingSources([]);

      let accumulatedContent = "";

      abortControllerRef.current = apiClient.streamMessage(conversationId, content, {
        onToken: (token) => {
          accumulatedContent += token;
          setStreamingContent(accumulatedContent);
          callbacks?.onToken?.(token, accumulatedContent);
        },
        onSources: (sources) => {
          setStreamingSources(sources);
          callbacks?.onSources?.(sources);
        },
        onDone: (data) => {
          setIsStreaming(false);
          setStreamingContent("");
          setStreamingSources([]);

          // Invalidate queries
          queryClient.invalidateQueries({
            queryKey: messageKeys.listByConversation(conversationId),
          });
          queryClient.invalidateQueries({
            queryKey: conversationKeys.lists(),
          });

          callbacks?.onDone?.(data);
        },
        onError: (error) => {
          setIsStreaming(false);
          setStreamingContent("");
          setStreamingSources([]);
          callbacks?.onError?.(error);
        },
      });
    },
    [queryClient]
  );

  const abort = React.useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent("");
    setStreamingSources([]);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    sendStream,
    isStreaming,
    streamingContent,
    streamingSources,
    abort,
  };
}
