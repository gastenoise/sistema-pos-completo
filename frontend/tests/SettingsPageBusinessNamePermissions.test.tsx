/**
 * @vitest-environment jsdom
 * Test de UI para verificar permisos del campo businessData.name en SettingsPage
 * - Owner: campo editable
 * - Admin/Cashier: campo deshabilitado (solo lectura)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock de módulos externos
vi.mock('@/hooks/useBusinessPermissions', () => ({
  useBusinessPermissions: vi.fn(),
}));

vi.mock('@/components/pos/BusinessContext', () => ({
  useBusiness: vi.fn(),
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/modules/settings/api', () => ({
  getCategories: vi.fn(() => Promise.resolve([])),
  getPaymentMethods: vi.fn(() => Promise.resolve([])),
  getBankAccount: vi.fn(() => Promise.resolve(null)),
  getSmtpConfig: vi.fn(() => Promise.resolve(null)),
  updateBusiness: vi.fn(),
  updateCategory: vi.fn(),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  updatePaymentMethods: vi.fn(),
  updateBankAccount: vi.fn(),
  updateSmtpConfig: vi.fn(),
  testSmtpConfig: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import dinámico después de los mocks
let SettingsPage: any;

const createWrapper = (mockPermissions: { role: string; can: () => boolean }) => {
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

describe('SettingsPage - Business Name Field Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useBusinessPermissions } = require('@/hooks/useBusinessPermissions');
    const { useBusiness } = require('@/components/pos/BusinessContext');
    const { useAuth } = require('@/lib/AuthContext');
    
    // Configurar mocks por defecto
    useBusinessPermissions.mockReturnValue({
      role: 'owner',
      can: vi.fn(() => true),
    });
    
    useBusiness.mockReturnValue({
      businessId: 1,
      currentBusiness: {
        id: 1,
        name: 'Mi Negocio',
        email: 'test@negocio.com',
        address: 'Calle Test 123',
        phone: '+54 9 11 1234 5678',
        tax_id: '12345678901',
        color: '#3B82F6',
        currency: 'ARS',
        business_parameters: {},
      },
      refreshCurrentBusiness: vi.fn(),
    });
    
    useAuth.mockReturnValue({
      user: {
        id: 1,
        name: 'Usuario Test',
        email: 'user@test.com',
        allowed_login_ip: null,
      },
      updateUser: vi.fn(),
    });
  });

  it('debe habilitar el campo name para rol owner', async () => {
    const { useBusinessPermissions } = require('@/hooks/useBusinessPermissions');
    useBusinessPermissions.mockReturnValue({
      role: 'owner',
      can: vi.fn(() => true),
    });

    const SettingsPageComponent = (await import('@/modules/settings/components/SettingsPage')).default;
    
    render(<SettingsPageComponent />, {
      wrapper: createWrapper({ role: 'owner', can: () => true }),
    });

    // Esperar que el componente se renderice
    await waitFor(() => {
      const nameInput = screen.getByLabelText('Nombre') as HTMLInputElement;
      expect(nameInput).toBeInTheDocument();
      expect(nameInput.disabled).toBe(false);
    });
  });

  it('debe deshabilitar el campo name para rol admin', async () => {
    const { useBusinessPermissions } = require('@/hooks/useBusinessPermissions');
    useBusinessPermissions.mockReturnValue({
      role: 'admin',
      can: vi.fn(() => false),
    });

    const SettingsPageComponent = (await import('@/modules/settings/components/SettingsPage')).default;
    
    render(<SettingsPageComponent />, {
      wrapper: createWrapper({ role: 'admin', can: () => false }),
    });

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Nombre') as HTMLInputElement;
      expect(nameInput).toBeInTheDocument();
      expect(nameInput.disabled).toBe(true);
    });
  });

  it('debe deshabilitar el campo name para rol cashier', async () => {
    const { useBusinessPermissions } = require('@/hooks/useBusinessPermissions');
    useBusinessPermissions.mockReturnValue({
      role: 'cashier',
      can: vi.fn(() => false),
    });

    const SettingsPageComponent = (await import('@/modules/settings/components/SettingsPage')).default;
    
    render(<SettingsPageComponent />, {
      wrapper: createWrapper({ role: 'cashier', can: () => false }),
    });

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Nombre') as HTMLInputElement;
      expect(nameInput).toBeInTheDocument();
      expect(nameInput.disabled).toBe(true);
    });
  });

  it('debe permitir editar el nombre solo para owner', async () => {
    const { useBusinessPermissions } = require('@/hooks/useBusinessPermissions');
    const { updateBusiness } = require('@/modules/settings/api');
    
    useBusinessPermissions.mockReturnValue({
      role: 'owner',
      can: vi.fn(() => true),
    });
    
    updateBusiness.mockResolvedValue({
      id: 1,
      name: 'Nuevo Nombre',
      email: 'test@negocio.com',
    });

    const SettingsPageComponent = (await import('@/modules/settings/components/SettingsPage')).default;
    
    render(<SettingsPageComponent />, {
      wrapper: createWrapper({ role: 'owner', can: () => true }),
    });

    await waitFor(async () => {
      const nameInput = screen.getByLabelText('Nombre') as HTMLInputElement;
      expect(nameInput.disabled).toBe(false);
      
      // Simular cambio de valor
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Nuevo Nombre del Negocio');
      
      expect(nameInput.value).toBe('Nuevo Nombre del Negocio');
    });
  });
});
