<?php

namespace App\Support;

class PermissionCatalog
{
    public const CASH_REGISTER_VIEW = 'cash_register.view';
    public const CASH_REGISTER_OPEN = 'cash_register.open';
    public const CASH_REGISTER_CLOSE = 'cash_register.close';
    public const SETTINGS_PERMISSIONS_MANAGE = 'settings.permissions.manage';
    public const SALES_VOID = 'sales.void';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::CASH_REGISTER_VIEW,
            self::CASH_REGISTER_OPEN,
            self::CASH_REGISTER_CLOSE,
            self::SETTINGS_PERMISSIONS_MANAGE,
            self::SALES_VOID,
        ];
    }

    /**
     * @return array<string, bool>
     */
    public static function defaultsForRole(string $role): array
    {
        return match ($role) {
            'owner', 'admin' => array_fill_keys(self::all(), true),
            'cashier' => [
                self::CASH_REGISTER_VIEW => false,
                self::CASH_REGISTER_OPEN => false,
                self::CASH_REGISTER_CLOSE => false,
                self::SETTINGS_PERMISSIONS_MANAGE => false,
                self::SALES_VOID => false,
            ],
            default => [],
        };
    }
}
