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

  const eventSource = new EventSource(url, { withCredentials: true });

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onProgress(data);
      if (data.status === 'INDEXED' || data.status === 'FAILED') {
        eventSource.close();
        if (data.status === 'INDEXED') onDone();
        else onError();
      }
    } catch {
      // ignore parse errors
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    onError();
  };

  return () => eventSource.close();
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

          const reader = new FileReader();
          const content = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(uploadedFile.file);
          });

          const doc = await apiClient.post<{ id: string }>(`/ais/${aiId}/documents/text`, {
            filename: uploadedFile.file.name,
            content,
          });

          // Subscribe to real-time progress via SSE
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, status: 'processing' as const, progress: 10 } : f
            )
          );

          subscribeToProgress(
            aiId,
            doc.id,
            (event) => {
              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id
                    ? { ...f, progress: Math.max(10, event.progress) }
                    : f
                )
              );
            },
            () => {
              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id
                    ? { ...f, status: 'success' as const, progress: 100 }
                    : f
                )
              );
              queryClient.invalidateQueries({
                queryKey: documentKeys.listByAI(aiId),
              });
            },
            () => {
              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id
                    ? { ...f, status: 'error' as const, error: "Echec de l'indexation" }
                    : f
                )
              );
            }
          );
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
