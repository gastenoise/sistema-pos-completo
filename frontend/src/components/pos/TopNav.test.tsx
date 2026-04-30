// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import TopNav from './TopNav';

// Mock Lucide icons to simplify testing
vi.mock('lucide-react', () => ({
  Menu: () => <div data-testid="icon-menu" />,
  X: () => <div data-testid="icon-x" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  Store: () => <div data-testid="icon-store" />,
  LogOut: () => <div data-testid="icon-logout" />,
  Settings: () => <div data-testid="icon-settings" />,
  BarChart3: () => <div data-testid="icon-barchart" />,
  Package: () => <div data-testid="icon-package" />,
  ShoppingCart: () => <div data-testid="icon-shopping-cart" />,
  CreditCard: () => <div data-testid="icon-credit-card" />,
  User: () => <div data-testid="icon-user" />,
}));

// Mock permissions and utils
vi.mock('@/components/pos/topNav.permissions', () => ({
  buildTopNavItems: () => []
}));

vi.mock('@/utils', () => ({
  createPageUrl: (name: string) => `/${name}`
}));

describe('TopNav', () => {
  const defaultProps = {
    user: { name: 'Test User' },
    onLogout: vi.fn(),
    currentPage: 'POS',
    currentBusiness: { id: 1, name: 'My Business', color: '#ff0000' },
    can: () => true,
  };

  it('renders the business name as a static label', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MemoryRouter>
          <TopNav {...defaultProps} />
        </MemoryRouter>
      );
    });

    // Check if business name is rendered
    expect(container.textContent).toContain('My Business');

    // Check if Store icon is present
    expect(container.querySelector('[data-testid="icon-store"]')).not.toBeNull();

    // Check that ChevronDown (the dropdown indicator) is NOT present
    expect(container.querySelector('[data-testid="icon-chevron-down"]')).toBeNull();

    // The business name should NOT be inside a button (dropdown trigger)
    const buttons = container.querySelectorAll('button');
    const businessNameButton = Array.from(buttons).find(btn => btn.textContent?.includes('My Business'));
    expect(businessNameButton).toBeUndefined();

    act(() => {
      root.unmount();
    });
  });

  it('does not render the business section if currentBusiness is missing', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MemoryRouter>
          <TopNav {...defaultProps} currentBusiness={null} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).not.toContain('My Business');
    expect(container.querySelector('[data-testid="icon-store"]')).toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
