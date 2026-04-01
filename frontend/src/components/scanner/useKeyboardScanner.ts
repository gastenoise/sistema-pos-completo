import { useEffect, useRef } from 'react';

type ScanProgressMeta = {
  isScannerSession: boolean;
  lastKeyAt: number;
};

type UseKeyboardScannerOptions = {
  enabled?: boolean;
  contextId?: string;
  contextAllowlist?: string[];
  contextBlocklist?: string[];
  minScannerDigits?: number;
  maxInterKeyDelayMs?: number;
  inactivityTimeoutMs?: number;
  debug?: boolean;
  onScanComplete: (value: string) => void;
  onScanProgress?: (value: string, meta: ScanProgressMeta) => void;
};

const DEFAULT_MIN_SCANNER_DIGITS = 6;
const DEFAULT_MAX_INTER_KEY_DELAY_MS = 45;
const DEFAULT_INACTIVITY_TIMEOUT_MS = 120;

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT';
};

export const useKeyboardScanner = ({
  enabled = true,
  contextId,
  contextAllowlist,
  contextBlocklist,
  minScannerDigits = DEFAULT_MIN_SCANNER_DIGITS,
  maxInterKeyDelayMs = DEFAULT_MAX_INTER_KEY_DELAY_MS,
  inactivityTimeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
  debug = false,
  onScanComplete,
  onScanProgress,
}: UseKeyboardScannerOptions) => {
  const bufferRef = useRef('');
  const lastKeyAtRef = useRef<number | null>(null);
  const fastDigitsCountRef = useRef(0);
  const hasSlowKeyRef = useRef(false);
  const hasThresholdQualifiedRef = useRef(false);
  const inactivityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const emitProgress = () => {
      onScanProgress?.(bufferRef.current, {
        isScannerSession: hasThresholdQualifiedRef.current
          && !hasSlowKeyRef.current
          && fastDigitsCountRef.current >= minScannerDigits,
        lastKeyAt: lastKeyAtRef.current ?? 0,
      });
    };

    const logDebug = (eventName: string, details: Record<string, unknown>) => {
      if (!debug || !import.meta.env.DEV) {
        return;
      }

      console.debug('[scanner]', eventName, details);
    };

    const isContextAllowed = () => {
      if (!contextId) {
        return true;
      }

      if (contextBlocklist?.includes(contextId)) {
        return false;
      }

      if (contextAllowlist && contextAllowlist.length > 0) {
        return contextAllowlist.includes(contextId);
      }

      return true;
    };

    const clearInactivityTimer = () => {
      if (inactivityTimerRef.current === null) {
        return;
      }

      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    };

    const resetSession = () => {
      clearInactivityTimer();
      bufferRef.current = '';
      fastDigitsCountRef.current = 0;
      hasSlowKeyRef.current = false;
      hasThresholdQualifiedRef.current = false;
      lastKeyAtRef.current = null;
      emitProgress();
    };

    const restartInactivityTimer = () => {
      clearInactivityTimer();
      inactivityTimerRef.current = window.setTimeout(() => {
        resetSession();
      }, inactivityTimeoutMs);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) {
        return;
      }

      if (!isContextAllowed()) {
        return;
      }

      const now = Date.now();
      const delta = lastKeyAtRef.current === null ? 0 : now - lastKeyAtRef.current;

      if (event.key === 'Enter') {
        const isScannerSession = hasThresholdQualifiedRef.current
          && !hasSlowKeyRef.current
          && fastDigitsCountRef.current >= minScannerDigits;
        const scannedValue = bufferRef.current;

        logDebug('enter', {
          isScannerSession,
          scannedLength: scannedValue.length,
          hasSlowKey: hasSlowKeyRef.current,
          hasThresholdQualified: hasThresholdQualifiedRef.current,
        });

        if (isScannerSession && scannedValue.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          onScanComplete(scannedValue);
        }

        resetSession();
        return;
      }

      if (!/^\d$/.test(event.key)) {
        resetSession();
        return;
      }

      if (delta > inactivityTimeoutMs) {
        bufferRef.current = '';
        fastDigitsCountRef.current = 0;
      }

      const isFastDigit = lastKeyAtRef.current === null || delta <= maxInterKeyDelayMs;

      if (lastKeyAtRef.current !== null && delta > maxInterKeyDelayMs) {
        hasSlowKeyRef.current = true;
      }

      if (isFastDigit) {
        fastDigitsCountRef.current += 1;
      } else {
        fastDigitsCountRef.current = 1;
      }

      if (lastKeyAtRef.current !== null && delta <= maxInterKeyDelayMs) {
        hasThresholdQualifiedRef.current = true;
      }

      bufferRef.current += event.key;
      lastKeyAtRef.current = now;
      restartInactivityTimer();
      logDebug('digit', {
        key: event.key,
        delta,
        fastDigits: fastDigitsCountRef.current,
        hasSlowKey: hasSlowKeyRef.current,
        hasThresholdQualified: hasThresholdQualifiedRef.current,
        targetEditable: isEditableElement(event.target),
      });
      emitProgress();
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableElement(event.target)) {
        resetSession();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        resetSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('blur', resetSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInactivityTimer();
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('blur', resetSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    contextAllowlist,
    contextBlocklist,
    contextId,
    debug,
    enabled,
    inactivityTimeoutMs,
    maxInterKeyDelayMs,
    minScannerDigits,
    onScanComplete,
    onScanProgress,
  ]);
};
