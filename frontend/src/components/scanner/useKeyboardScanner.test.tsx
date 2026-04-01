// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useKeyboardScanner } from './useKeyboardScanner';

function TestHarness({ onScanComplete }: { onScanComplete: (value: string) => void }) {
  useKeyboardScanner({ onScanComplete, minScannerDigits: 6, maxInterKeyDelayMs: 45 });
  return null;
}

describe('useKeyboardScanner', () => {
  it('ráfaga rápida + Enter => completa scan', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onScanComplete = vi.fn();

    act(() => {
      root.render(<TestHarness onScanComplete={onScanComplete} />);
    });

    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    const digits = ['1', '2', '3', '4', '5', '6'];
    for (const digit of digits) {
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: digit }));
      });
      now += 20;
    }

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(onScanComplete).toHaveBeenCalledTimes(1);
    expect(onScanComplete).toHaveBeenCalledWith('123456');

    act(() => {
      root.unmount();
    });
  });

  it('tipeo lento + Enter => no completa scan', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onScanComplete = vi.fn();

    act(() => {
      root.render(<TestHarness onScanComplete={onScanComplete} />);
    });

    let now = 2000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    const digits = ['1', '2', '3', '4', '5', '6'];
    for (const digit of digits) {
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: digit }));
      });
      now += 80;
    }

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(onScanComplete).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });
});
