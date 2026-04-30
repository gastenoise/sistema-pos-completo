/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBusinessUsersFlow } from './useBusinessUsersFlow';
import * as api from '@/modules/settings/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/modules/settings/api', () => ({
  getBusinessUsers: vi.fn(),
  updateBusinessUserRole: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useBusinessUsersFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads users when businessId is provided', async () => {
    const mockUsers = [
      { id: 1, name: 'User 1', email: 'user1@example.com', role: 'owner' },
    ];
    vi.mocked(api.getBusinessUsers).mockResolvedValue(mockUsers);

    const { result } = renderHook(() => useBusinessUsersFlow(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toEqual(mockUsers);
  });

  it('handles role update successfully', async () => {
    const mockUsers = [
      { id: 1, name: 'User 1', email: 'user1@example.com', role: 'cashier' },
    ];
    vi.mocked(api.getBusinessUsers).mockResolvedValue(mockUsers);
    vi.mocked(api.updateBusinessUserRole).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useBusinessUsersFlow(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.handleUpdateRole(1, 'admin');

    expect(api.updateBusinessUserRole).toHaveBeenCalledWith(1, 'admin');
    expect(result.current.updatingUserId).toBe(null);
  });
});
