import { describe, it, expect } from 'vitest';
import { getRoleLabel } from './roleLabels';

describe('getRoleLabel', () => {
  it('should return Propietario for owner', () => {
    expect(getRoleLabel('owner')).toBe('Propietario');
  });

  it('should return Administrador for admin', () => {
    expect(getRoleLabel('admin')).toBe('Administrador');
  });

  it('should return Cajero for cashier', () => {
    expect(getRoleLabel('cashier')).toBe('Cajero');
  });

  it('should be case-insensitive for mapped roles', () => {
    expect(getRoleLabel('OWNER')).toBe('Propietario');
    expect(getRoleLabel('Admin')).toBe('Administrador');
  });

  it('should return capitalized fallback for unknown roles', () => {
    expect(getRoleLabel('guest')).toBe('Guest');
    expect(getRoleLabel('SUPER_USER')).toBe('SUPER_USER');
  });

  it('should return ... for null or undefined roles', () => {
    expect(getRoleLabel(null)).toBe('...');
    expect(getRoleLabel(undefined)).toBe('...');
    expect(getRoleLabel('')).toBe('...');
  });
});
