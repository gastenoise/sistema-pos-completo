/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BusinessUserRow } from './SettingsPage';
import React from 'react';

// Mock ResizeObserver for Radix UI / JSDOM
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as any;

describe('BusinessUserRow', () => {
  const mockHandleUpdateRole = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders owner user correctly (disabled select and save)', () => {
    const user = { id: 1, name: 'Owner User', email: 'owner@example.com', role: 'owner' };
    render(
      <table>
        <tbody>
          <BusinessUserRow
            user={user}
            updatingUserId={null}
            handleUpdateRole={mockHandleUpdateRole}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Owner User')).toBeDefined();
    expect(screen.getByText('owner@example.com')).toBeDefined();

    const select = screen.getByRole('combobox');
    expect(select.getAttribute('disabled')).not.toBeNull();

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    expect(saveButton.getAttribute('disabled')).not.toBeNull();

    expect(screen.queryByText(/gestionado por db/i)).not.toBeNull();
    cleanup();
  });

  it('renders admin user correctly (enabled select, disabled save initially)', () => {
    const user = { id: 2, name: 'Admin User', email: 'admin@example.com', role: 'admin' };
    render(
      <table>
        <tbody>
          <BusinessUserRow
            user={user}
            updatingUserId={null}
            handleUpdateRole={mockHandleUpdateRole}
          />
        </tbody>
      </table>
    );

    const select = screen.getByRole('combobox');
    expect(select.getAttribute('disabled')).toBeNull();

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    expect(saveButton.getAttribute('disabled')).not.toBeNull(); // Disabled because role hasn't changed

    expect(screen.queryByText(/gestionado por db/i)).toBeNull();
    cleanup();
  });
});
