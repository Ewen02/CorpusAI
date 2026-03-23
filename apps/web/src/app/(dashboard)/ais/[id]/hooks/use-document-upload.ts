'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UploadedFile } from '@corpusai/ui';
import { apiClient, API_URL } from '@/lib/api-client';
import { documentKeys, useDeleteDocument, useRetryDocument } from '@/lib/queries';

interface UseDocumentUploadOptions {
  aiId: string;
}

function subscribeToProgress(
  aiId: string,
  documentId: string,
  onProgress: (event: { progress: number; status: string; step: string | null }) => void,
  onDone: () => void,
  onError: () => void
) {
  const url = `${API_URL}/ais/${aiId}/documents/${documentId}/progress/stream`;
  let closed = false;
  let es: EventSource;

  function connect() {
    es = new EventSource(url, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onProgress(data);
        if (data.status === 'INDEXED') {
          closed = true;
          es.close();
          onDone();
        } else if (data.status === 'FAILED') {
          closed = true;
          es.close();
          onError();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      if (closed) return;
      es.close();
      // Poll DB for real status — stream drop ≠ processing failure
      apiClient
        .get<{ status: string; progress: number; step: string | null }>(
          `/ais/${aiId}/documents/${documentId}/progress`
        )
        .then((data) => {
          if (closed) return;
          if (data.status === 'INDEXED') {
            closed = true;
            onDone();
          } else if (data.status === 'FAILED') {
            closed = true;
            onError();
          } else {
            // Still processing — reconnect after short delay
            setTimeout(connect, 3000);
          }
        })
        .catch(() => {
          if (!closed) setTimeout(connect, 5000);
        });
    };
  }

  connect();
  return () => {
    closed = true;
    es?.close();
  };
}

/**
 * Custom hook to manage document upload state and operations.
 * Handles file upload, deletion, and retry logic with real-time SSE progress.
 */
export function useDocumentUpload({ aiId }: UseDocumentUploadOptions) {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const queryClient = useQueryClient();
  const deleteDocument = useDeleteDocument();
  const retryDocument = useRetryDocument();

  // Track active SSE subscriptions for cleanup on unmount
  const unsubscribersRef = React.useRef<Array<() => void>>([]);

  React.useEffect(() => {
    return () => {
      for (const unsub of unsubscribersRef.current) {
        unsub();
      }
      unsubscribersRef.current = [];
    };
  }, []);

  // Handle file upload
  const uploadFiles = React.useCallback(
    async (files: File[]) => {
      const newFiles: UploadedFile[] = files.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        file,
        status: 'pending' as const,
        progress: 0,
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);

      for (const uploadedFile of newFiles) {
        try {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, status: 'uploading' as const, progress: 5 } : f
            )
          );

          const isPlainText =
            uploadedFile.file.type === 'text/plain' || uploadedFile.file.type === 'text/markdown';

          let doc: { id: string };

          if (isPlainText) {
            const reader = new FileReader();
            const content = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsText(uploadedFile.file);
            });
            doc = await apiClient.post<{ id: string }>(`/ais/${aiId}/documents/text`, {
              filename: uploadedFile.file.name,
              content,
            });
          } else {
            const formData = new FormData();
            formData.append('file', uploadedFile.file);
            doc = await apiClient.upload<{ id: string }>(`/ais/${aiId}/documents/upload`, formData);
          }

          // Subscribe to real-time progress via SSE
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, status: 'processing' as const, progress: 10 } : f
            )
          );

          const unsubscribe = subscribeToProgress(
            aiId,
            doc.id,
            (event) => {
              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id ? { ...f, progress: Math.max(10, event.progress) } : f
                )
              );
            },
            () => {
              unsubscribersRef.current = unsubscribersRef.current.filter((u) => u !== unsubscribe);
              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id ? { ...f, status: 'success' as const, progress: 100 } : f
                )
              );
              queryClient.invalidateQueries({
                queryKey: documentKeys.listByAI(aiId),
              });
            },
            () => {
              unsubscribersRef.current = unsubscribersRef.current.filter((u) => u !== unsubscribe);
              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id
                    ? { ...f, status: 'error' as const, error: "Echec de l'indexation" }
                    : f
                )
              );
            }
          );
          unsubscribersRef.current.push(unsubscribe);
        } catch (error) {
          console.error('Upload error:', error);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? { ...f, status: 'error' as const, error: "Echec de l'upload" }
                : f
            )
          );
        }
      }
    },
    [aiId, queryClient]
  );

  // Remove file from list
  const removeFile = React.useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Delete an indexed document
  const deleteIndexedDocument = React.useCallback(
    (documentId: string) => {
      deleteDocument.mutate({ aiId, id: documentId });
    },
    [aiId, deleteDocument]
  );

  // Retry failed document indexing
  const retryFailedDocument = React.useCallback(
    (documentId: string) => {
      retryDocument.mutate({ aiId, id: documentId });
    },
    [aiId, retryDocument]
  );

  return {
    uploadedFiles,
    uploadFiles,
    removeFile,
    deleteIndexedDocument,
    retryFailedDocument,
    isDeleting: deleteDocument.isPending,
    isRetrying: retryDocument.isPending,
  };
}
