<?php

namespace App\Services;

use App\Models\Business;

class BusinessSmtpRuntimeConfigurator
{
    /**
     * @return array{host:?string,port:?int,username:?string,password:?string,encryption:?string,from_email:?string,from_name:?string}
     */
    public function buildConfig(Business $business, array $overrides = []): array
    {
        $smtp = $business->smtpSettings;

        $config = [
            'host' => $overrides['host'] ?? $smtp?->host,
            'port' => isset($overrides['port']) ? (int) $overrides['port'] : ($smtp?->port ? (int) $smtp->port : null),
            'username' => $overrides['username'] ?? $smtp?->username,
            'password' => $overrides['password'] ?? $smtp?->password,
            'encryption' => $overrides['encryption'] ?? $smtp?->encryption,
            'from_email' => $overrides['from_email'] ?? $smtp?->from_email,
            'from_name' => $overrides['from_name'] ?? $smtp?->from_name,
        ];

        if (!$config['from_email']) {
            $config['from_email'] = $business->email;
        }

        if (!$config['from_name']) {
            $config['from_name'] = $business->name;
        }

        return $config;
    }

    /**
     * @return array{valid:bool,message:?string,config?:array<string,mixed>}
     */
    public function validateActiveAndCompleteConfig(Business $business): array
    {
        $smtp = $business->smtpSettings;

        if (!$smtp || !$smtp->active) {
            return [
                'valid' => false,
                'message' => 'No hay una configuración SMTP activa para este negocio.',
            ];
        }

        $config = $this->buildConfig($business);
        if (!$config['host'] || !$config['port'] || !$config['from_email']) {
            return [
                'valid' => false,
                'message' => 'La configuración SMTP activa está incompleta. Revisá host, puerto y remitente.',
            ];
        }

        return [
            'valid' => true,
            'message' => null,
            'config' => $config,
        ];
    }

    /**
     * @param array{host:?string,port:?int,username:?string,password:?string,encryption:?string,from_email:?string,from_name:?string} $config
     */
    public function apply(array $config): void
    {
        $scheme = match ($config['encryption'] ?? null) {
            'ssl' => 'smtps',
            default => 'smtp',
        };

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $config['host'],
            'mail.mailers.smtp.port' => (int) $config['port'],
            'mail.mailers.smtp.username' => $config['username'],
            'mail.mailers.smtp.password' => $config['password'],
            'mail.mailers.smtp.scheme' => $scheme,
            'mail.from.address' => $config['from_email'],
            'mail.from.name' => $config['from_name'],
        ]);
    }
}
