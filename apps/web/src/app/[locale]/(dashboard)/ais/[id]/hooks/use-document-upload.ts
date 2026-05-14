'use client';

import * as React from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import type { UploadedFile } from '@corpusai/ui';
import { apiClient, ApiError, API_URL } from '@/lib/api-client';
import { track } from '@/lib/analytics';
import { documentKeys, useDeleteDocument, useRetryDocument } from '@/lib/queries';
import { reportError } from '@/lib/log';
import { useTranslations } from 'next-intl';

interface UseDocumentUploadOptions {
  aiId: string;
  documents?: { id: string; filename: string; size: number; status: string }[];
}

interface StepTimerState {
  lastStepAt: number;
  pendingSteps: string[];
  timer: ReturnType<typeof setTimeout> | null;
  onDoneCallback: (() => void) | null;
}

const MIN_STEP_DISPLAY_MS = 5000;

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

// Handles a progress SSE event: updates progress and queues step transitions.
function handleProgressEvent(
  fileId: string,
  event: { progress: number; step: string | null },
  stepTimersRef: React.RefObject<Map<string, StepTimerState>>,
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
  scheduleNextStep: (id: string) => void
) {
  let stepState = stepTimersRef.current.get(fileId);
  if (!stepState) {
    stepState = { lastStepAt: 0, pendingSteps: [], timer: null, onDoneCallback: null };
    stepTimersRef.current.set(fileId, stepState);
  }
  setUploadedFiles((prev) =>
    prev.map((f) => (f.id === fileId ? { ...f, progress: Math.max(10, event.progress) } : f))
  );
  if (event.step !== null) {
    const now = Date.now();
    const elapsed = now - stepState.lastStepAt;
    if (stepState.lastStepAt === 0 || elapsed >= MIN_STEP_DISPLAY_MS) {
      if (stepState.timer) clearTimeout(stepState.timer);
      stepState.pendingSteps = [];
      stepState.lastStepAt = now;
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, currentStep: event.step } : f))
      );
    } else {
      if (!stepState.pendingSteps.includes(event.step)) stepState.pendingSteps.push(event.step);
      if (!stepState.timer) scheduleNextStep(fileId);
    }
  }
}

// Returns the onDone callback for a subscription: waits for step queue to drain, then finalizes.
function buildFinalizeHandler(
  fileId: string,
  aiId: string,
  stepTimersRef: React.RefObject<Map<string, StepTimerState>>,
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
  queryClient: QueryClient
): () => void {
  const finalize = () => {
    stepTimersRef.current.delete(fileId);
    setUploadedFiles((prev) => {
      const entry = prev.find((f) => f.id === fileId);
      if (entry && entry.file) {
        track('document_indexed', {
          mimeType: entry.file.type || 'unknown',
          sizeMb: Math.round((entry.file.size / (1024 * 1024)) * 100) / 100,
        });
      }
      return prev.map((f) =>
        f.id === fileId ? { ...f, status: 'success' as const, progress: 100 } : f
      );
    });
    queryClient.invalidateQueries({ queryKey: documentKeys.listByAI(aiId) });
  };
  return () => {
    const stepState = stepTimersRef.current.get(fileId);
    if (!stepState || (stepState.pendingSteps.length === 0 && !stepState.timer)) {
      if (stepState) {
        const remaining = Math.max(0, MIN_STEP_DISPLAY_MS - (Date.now() - stepState.lastStepAt));
        if (remaining > 0) {
          stepState.timer = setTimeout(finalize, remaining);
          return;
        }
      }
      finalize();
      return;
    }
    stepState.onDoneCallback = finalize;
  };
}

/**
 * Manages document upload state with real-time SSE progress and reconnection on page return.
 */
export function useDocumentUpload({ aiId, documents }: UseDocumentUploadOptions) {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const queryClient = useQueryClient();
  const deleteDocument = useDeleteDocument();
  const retryDocument = useRetryDocument();
  const t = useTranslations('errors');

  const unsubscribersRef = React.useRef<Set<() => void>>(new Set());
  const stepTimersRef = React.useRef<Map<string, StepTimerState>>(new Map());
  const subscribedDocIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    return () => {
      for (const unsub of unsubscribersRef.current) unsub();
      unsubscribersRef.current.clear();
      for (const state of stepTimersRef.current.values()) {
        if (state.timer) clearTimeout(state.timer);
      }
      stepTimersRef.current.clear();
    };
  }, []);

  const scheduleNextStep = React.useCallback((fileId: string) => {
    const state = stepTimersRef.current.get(fileId);
    if (!state) return;

    const remaining = Math.max(0, MIN_STEP_DISPLAY_MS - (Date.now() - state.lastStepAt));

    state.timer = setTimeout(() => {
      const s = stepTimersRef.current.get(fileId);
      if (!s) return;
      s.timer = null;

      const nextStep = s.pendingSteps.shift();
      if (nextStep) {
        s.lastStepAt = Date.now();
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, currentStep: nextStep } : f))
        );
        if (s.pendingSteps.length > 0) {
          scheduleNextStep(fileId);
        } else if (s.onDoneCallback) {
          const cb = s.onDoneCallback;
          s.onDoneCallback = null;
          s.timer = setTimeout(cb, MIN_STEP_DISPLAY_MS);
        }
      } else if (s.onDoneCallback) {
        const cb = s.onDoneCallback;
        s.onDoneCallback = null;
        cb();
      }
    }, remaining);
  }, []);

  // Reconnects to documents already in PROCESSING/PENDING when returning to the page.
  // Pre-fetches current step from REST before injecting the synthetic file to avoid a race
  // condition where the first SSE event arrives before the React state update has flushed.
  React.useEffect(() => {
    if (!documents) return;
    for (const doc of documents) {
      if (doc.status !== 'PROCESSING' && doc.status !== 'PENDING') continue;
      if (subscribedDocIdsRef.current.has(doc.id)) continue;

      subscribedDocIdsRef.current.add(doc.id);
      const fileId = `doc-${doc.id}`;

      apiClient
        .get<{ status: string; progress: number; step: string | null }>(
          `/ais/${aiId}/documents/${doc.id}/progress`
        )
        .then((initial) => {
          if (initial.status === 'INDEXED' || initial.status === 'FAILED') {
            subscribedDocIdsRef.current.delete(doc.id);
            queryClient.invalidateQueries({ queryKey: documentKeys.listByAI(aiId) });
            return;
          }

          stepTimersRef.current.set(fileId, {
            lastStepAt: initial.step ? Date.now() : 0,
            pendingSteps: [],
            timer: null,
            onDoneCallback: null,
          });

          setUploadedFiles((prev) => {
            if (prev.some((f) => f.id === fileId)) return prev;
            return [
              ...prev,
              {
                id: fileId,
                file: new File([], doc.filename, { type: 'application/octet-stream' }),
                status: 'processing' as const,
                progress: Math.max(10, initial.progress),
                currentStep: initial.step ?? undefined,
              },
            ];
          });

          const unsubscribe = subscribeToProgress(
            aiId,
            doc.id,
            (event) =>
              handleProgressEvent(fileId, event, stepTimersRef, setUploadedFiles, scheduleNextStep),
            () => {
              unsubscribersRef.current.delete(unsubscribe);
              subscribedDocIdsRef.current.delete(doc.id);
              buildFinalizeHandler(fileId, aiId, stepTimersRef, setUploadedFiles, queryClient)();
            },
            () => {
              unsubscribersRef.current.delete(unsubscribe);
              subscribedDocIdsRef.current.delete(doc.id);
              const stepState = stepTimersRef.current.get(fileId);
              if (stepState?.timer) clearTimeout(stepState.timer);
              stepTimersRef.current.delete(fileId);
              track('document_upload_failed', { reason: 'indexing_failed' });
              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.id === fileId
                    ? { ...f, status: 'error' as const, error: t('indexingFailed') }
                    : f
                )
              );
            }
          );
          unsubscribersRef.current.add(unsubscribe);
        })
        .catch(() => {
          subscribedDocIdsRef.current.delete(doc.id);
        });
    }
  }, [aiId, documents, scheduleNextStep, queryClient, t]);

  const subscribeDoc = React.useCallback(
    (fileId: string, docId: string) => {
      subscribedDocIdsRef.current.add(docId);
      const unsubscribe = subscribeToProgress(
        aiId,
        docId,
        (event) =>
          handleProgressEvent(fileId, event, stepTimersRef, setUploadedFiles, scheduleNextStep),
        () => {
          unsubscribersRef.current.delete(unsubscribe);
          subscribedDocIdsRef.current.delete(docId);
          buildFinalizeHandler(fileId, aiId, stepTimersRef, setUploadedFiles, queryClient)();
        },
        () => {
          unsubscribersRef.current.delete(unsubscribe);
          subscribedDocIdsRef.current.delete(docId);
          const stepState = stepTimersRef.current.get(fileId);
          if (stepState?.timer) clearTimeout(stepState.timer);
          stepTimersRef.current.delete(fileId);
          track('document_upload_failed', { reason: 'indexing_failed' });
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: 'error' as const, error: t('indexingFailed') } : f
            )
          );
        }
      );
      unsubscribersRef.current.add(unsubscribe);
    },
    [aiId, queryClient, scheduleNextStep, t]
  );

  const uploadFiles = React.useCallback(
    async (files: File[]) => {
      // Client-side file size validation (max 100 MB hard limit, plan limits enforced by backend)
      const MAX_FILE_SIZE_MB = 100;
      const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

      const validFiles: File[] = [];
      const oversizedFiles: File[] = [];

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          oversizedFiles.push(file);
        } else {
          validFiles.push(file);
        }
      }

      // Immediately show errors for oversized files
      const oversizedEntries: UploadedFile[] = oversizedFiles.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        file,
        status: 'error' as const,
        progress: 0,
        error: t('fileTooLarge', {
          sizeMb: Math.round(file.size / 1024 / 1024),
          maxMb: MAX_FILE_SIZE_MB,
        }),
      }));

      if (oversizedEntries.length > 0) {
        setUploadedFiles((prev) => [...prev, ...oversizedEntries]);
      }

      if (validFiles.length === 0) return;

      // Analytics: funnel entry for upload
      const totalSizeMb = validFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
      track('document_upload_started', {
        fileCount: validFiles.length,
        totalSizeMb: Math.round(totalSizeMb * 100) / 100,
      });

      const newFiles: UploadedFile[] = validFiles.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        file,
        status: 'pending' as const,
        progress: 0,
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);

      const isPlainText = (type: string) => type === 'text/plain' || type === 'text/markdown';

      const textFiles = newFiles.filter((f) => isPlainText(f.file.type));
      const binaryFiles = newFiles.filter((f) => !isPlainText(f.file.type));

      // Bulk upload binary files in a single request
      if (binaryFiles.length > 0) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            binaryFiles.some((bf) => bf.id === f.id)
              ? { ...f, status: 'uploading' as const, progress: 5 }
              : f
          )
        );

        try {
          const formData = new FormData();
          for (const uf of binaryFiles) {
            formData.append('files', uf.file);
          }

          const docs = await apiClient.upload<{ id: string; filename: string }[]>(
            `/ais/${aiId}/documents/upload-bulk`,
            formData
          );

          setUploadedFiles((prev) =>
            prev.map((f) =>
              binaryFiles.some((bf) => bf.id === f.id)
                ? { ...f, status: 'processing' as const, progress: 10 }
                : f
            )
          );

          queryClient.invalidateQueries({ queryKey: documentKeys.listByAI(aiId) });

          // Subscribe to SSE for each document (correlate by array index)
          for (let i = 0; i < docs.length; i++) {
            subscribeDoc(binaryFiles[i]!.id, docs[i]!.id);
          }
        } catch (error) {
          // Map per-file errors if available
          const apiErr = error instanceof ApiError ? error : null;
          const fileErrors =
            (apiErr?.data as { errors?: { filename: string; reason: string }[] })?.errors ?? [];

          for (const uf of binaryFiles) {
            const fileError = fileErrors.find((e) => e.filename === uf.file.name);
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === uf.id
                  ? {
                      ...f,
                      status: 'error' as const,
                      error: fileError?.reason || apiErr?.message || "Echec de l'upload",
                    }
                  : f
              )
            );
          }
        }
      }

      // Upload text files sequentially (they use a different endpoint)
      for (const uploadedFile of textFiles) {
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

          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, status: 'processing' as const, progress: 10 } : f
            )
          );

          queryClient.invalidateQueries({ queryKey: documentKeys.listByAI(aiId) });
          subscribeDoc(uploadedFile.id, doc.id);
        } catch (error) {
          reportError('Upload error', error);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? { ...f, status: 'error' as const, error: t('uploadFailed') }
                : f
            )
          );
        }
      }
    },
    [aiId, queryClient, subscribeDoc, t]
  );

  const removeFile = React.useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const deleteIndexedDocument = React.useCallback(
    (documentId: string) => {
      deleteDocument.mutate({ aiId, id: documentId });
    },
    [aiId, deleteDocument]
  );

  const retryFailedDocument = React.useCallback(
    (documentId: string) => {
      retryDocument.mutate({ aiId, id: documentId });
    },
    [aiId, retryDocument]
  );

  const activeFiles = uploadedFiles.filter(
    (f) => f.status === 'uploading' || f.status === 'processing'
  );
  const indexingProgress =
    uploadedFiles.length === 0
      ? 0
      : activeFiles.length > 0
        ? activeFiles.reduce((sum, f) => sum + (f.progress ?? 0), 0) / activeFiles.length
        : uploadedFiles.every((f) => f.status === 'success' || f.status === 'error')
          ? 100
          : 0;
  const allIndexed =
    uploadedFiles.length > 0 &&
    uploadedFiles.every((f) => f.status === 'success' || f.status === 'error');

  return {
    uploadedFiles,
    uploadFiles,
    removeFile,
    deleteIndexedDocument,
    retryFailedDocument,
    isDeleting: deleteDocument.isPending,
    isRetrying: retryDocument.isPending,
    indexingProgress,
    allIndexed,
  };
}
