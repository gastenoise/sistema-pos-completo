/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBusinessPermissions } from './useBusinessPermissions';
import { useUserBusinessContext } from './useUserBusinessContext';
import { apiClient } from '@/api/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0, // Force stale to allow refetch
        refetchOnWindowFocus: false, // Ensure we use the global default in tests
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('hooks refetch behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useBusinessPermissions does NOT refetch on window focus', async () => {
    const mockData = {
      data: {
        role: 'admin',
        permissions: { 'test.permission': true },
      },
    };
    vi.mocked(apiClient.get).mockResolvedValue(mockData);

    const { result } = renderHook(() => useBusinessPermissions('bus_123'), {
      wrapper: createWrapper(),
    });

    // Initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    // Simulate window focus
    window.dispatchEvent(new Event('focus'));

    // Wait a bit to see if any new call is made
    await new Promise((r) => setTimeout(r, 100));

    // Should still be 1
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('useUserBusinessContext does NOT refetch on window focus', async () => {
    const mockData = {
      data: {
        businesses: [],
      },
    };
    vi.mocked(apiClient.get).mockResolvedValue(mockData);

    const { result } = renderHook(() => useUserBusinessContext('bus_123'), {
      wrapper: createWrapper(),
    });

    // Initial load
    await waitFor(() => result.current.businesses.length === 0);
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    // Simulate window focus
    window.dispatchEvent(new Event('focus'));

    // Wait a bit
    await new Promise((r) => setTimeout(r, 100));

    // Should still be 1
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
