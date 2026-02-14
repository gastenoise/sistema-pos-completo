<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Business;
use App\Models\ApiKey;
use App\Models\PaymentMethod;
use App\Models\Category;
use App\Models\BankAccount;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Crear Usuarios
        $user = User::create([
            'name' => 'Admin POS',
            'email' => 'admin@example.com',
            'phone' => '1167894321',
            'password' => Hash::make('password'),
        ]);

        // 1b. Crear otro usuario para pruebas
        $testUser = User::create([
            'name' => 'Usuario de Prueba',
            'email' => 'test@example.com',
            'phone' => '1198765432',
            'password' => Hash::make('password'),
        ]);

        // 2. Crear 3 Negocios
        $businesses = [
            [
                'name' => 'Mi Comercio MVP',
                'address' => 'Calle Falsa 123',
                'email' => 'contacto@comercio.com',
            ],
            [
                'name' => 'Panadería La Espiga',
                'address' => 'Av. Pan 456',
                'email' => 'laespiga@pan.com',
                'phone' => '011 43210000',
            ],
            [
                'name' => 'Librería Libros+',
                'address' => 'Calle Libros 789',
                'email' => 'info@librosmas.com',
                'phone' => '011 42114444',
            ],
        ];

        // Métodos de pago por defecto a nivel global (ya no por negocio)
        DB::table('payment_methods')->insert([
            ['code' => 'cash', 'name' => 'Efectivo', 'icon' => 27, 'color' => '#1ABC9C'],
            ['code' => 'debit', 'name' => 'Débito', 'icon' => 28, 'color' => '#2ECC71'],
            ['code' => 'mercado_pago', 'name' => 'Mercado Pago', 'icon' => 29, 'color' => '#3498DB'],
            ['code' => 'bank_transfer', 'name' => 'Transferencia Bancaria', 'icon' => 30, 'color' => '#9B59B6'],
        ]);

        $defaultPreferredPaymentMethodId = PaymentMethod::where('code', 'cash')->value('id')
            ?? PaymentMethod::min('id');

        // Bancos de ejemplo para asociar a negocios
        $bankAccountsInfo = [
            [
                // Para Mi Comercio MVP
                'cbu' => '2850590940090418135201',
                'alias' => 'MICOMERCIO.MVP',
                'bank_name' => 'Banco BBVA',
                'account_holder_name' => 'Admin POS',
            ],
            [
                // Para Panadería La Espiga
                'cbu' => '2850590940090418135402',
                'alias' => 'LAESPIGA.PAN',
                'bank_name' => 'Banco Galicia',
                'account_holder_name' => 'Panadería La Espiga S.A.',
            ],
            [
                // Para Librería Libros+
                'cbu' => '2850590940090418135603',
                'alias' => 'LIBROS.MAS',
                'bank_name' => 'Banco Santander',
                'account_holder_name' => 'Libros Mas SRL',
            ],
        ];

        $businessIndex = 0;
        $createdBusinesses = [];
        foreach ($businesses as $bizData) {
            $business = Business::create(array_merge($bizData, [
                'preferred_payment_method_id' => $defaultPreferredPaymentMethodId,
                'color' => null,
            ]));
            $createdBusinesses[] = $business;

            // 4. Vincular Usuario Admin con Negocio como Owner
            $user->businesses()->attach($business->id, ['role' => 'owner']);

            // 4b. Vincular el Usuario de Prueba con el primer negocio como empleado
            if ($business->name === 'Mi Comercio MVP') {
                $testUser->businesses()->attach($business->id, ['role' => 'cashier']);
            }

            // 5. Asociar métodos de pago globales a cada negocio (tabla business_payment_method_hides se usa para esconder, no para asociar!)
            // Según la estructura, todos los métodos globales están activos para todos los negocios a menos que estén explícitamente ocultos.

            // 6. Crear algunas categorías por defecto
            $defaultCategories = [
                ['name' => 'General',   'color' => '#3B82F6', 'icon' => 1],  // Package
                ['name' => 'Alimentos', 'color' => '#10B981', 'icon' => 15], // Apple
                ['name' => 'Bebidas',   'color' => '#F59E0B', 'icon' => 3],  // Coffee
                ['name' => 'Limpieza',  'color' => '#8B5CF6', 'icon' => 22], // Scissors (closest match for cleaning)
                ['name' => 'Servicio',  'color' => '#3B82F6', 'icon' => 9],  // Wrench
                ['name' => 'Comisión',  'color' => '#F59E0B', 'icon' => 26], // Tag
                ['name' => 'Otros',     'color' => '#EF4444', 'icon' => 24], // Star
            ];

            foreach ($defaultCategories as $category) {
                Category::firstOrCreate([
                    'business_id' => $business->id,
                    'name' => $category['name'],
                ], [
                    'color' => $category['color'],
                    'icon' => $category['icon'],
                ]);
            }

            // 7. Crear y asociar una cuenta bancaria al negocio
            $bankData = $bankAccountsInfo[$businessIndex];
            // Evitar duplicados si se vuelve a correr el seeder
            BankAccount::updateOrCreate(
                [
                    'business_id' => $business->id,
                ],
                [
                    'cbu' => $bankData['cbu'],
                    'alias' => $bankData['alias'],
                    'bank_name' => $bankData['bank_name'],
                    'account_holder_name' => $bankData['account_holder_name'],
                ]
            );

            $businessIndex++;
        }

        $apiKeySeeds = [
            [
                'label' => 'seed-api-key-1',
                'plain' => 'test-api-key-1',
                'business' => $createdBusinesses[0] ?? null,
            ],
            [
                'label' => 'seed-api-key-2',
                'plain' => 'test-api-key-2',
                'business' => $createdBusinesses[1] ?? ($createdBusinesses[0] ?? null),
            ],
        ];

        foreach ($apiKeySeeds as $seed) {
            if (!$seed['business']) {
                continue;
            }

            ApiKey::firstOrCreate(
                [
                    'business_id' => $seed['business']->id,
                    'name' => $seed['label'],
                ],
                [
                    'user_id' => $user->id,
                    'key_hash' => hash('sha256', $seed['plain']),
                ]
            );
        }

        $this->command->info('Sistema inicializado: admin@example.com / password');
        $this->command->info('Usuario de prueba: test@example.com / password');
        $this->command->info('API key 1: test-api-key-1');
        $this->command->info('API key 2: test-api-key-2');
    }
}
