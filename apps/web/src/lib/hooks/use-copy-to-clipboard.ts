'use client';

import * as React from 'react';

/** Default duration (ms) the "copied" confirmation stays visible. */
export const COPY_FEEDBACK_MS = 2000;

interface UseCopyToClipboardResult {
  /** `true` for `resetMs` after a successful copy, then back to `false`. */
  copied: boolean;
  /** Write `text` to the clipboard and trigger the `copied` feedback window. */
  copy: (text: string) => Promise<void>;
}

/**
 * Copy text to the clipboard with a transient "copied" flag.
 * The reset timer is cleared on unmount and on repeated copies to avoid
 * setting state after the component has unmounted.
 */
export function useCopyToClipboard(resetMs: number = COPY_FEEDBACK_MS): UseCopyToClipboardResult {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = React.useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Clipboard unavailable (insecure context / permissions) — skip feedback.
        return;
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), resetMs);
    },
    [resetMs]
  );

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { copied, copy };
}
