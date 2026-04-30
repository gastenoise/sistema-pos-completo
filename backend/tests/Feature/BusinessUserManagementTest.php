<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusinessUserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_can_list_business_users()
    {
        $business = Business::create(['name' => 'Test Business']);
        $owner = User::factory()->create();
        $admin = User::factory()->create();

        $business->users()->attach($owner->id, ['role' => BusinessUser::ROLE_OWNER]);
        $business->users()->attach($admin->id, ['role' => BusinessUser::ROLE_ADMIN]);

        $this->actingAs($owner);

        $response = $this->withHeaders(['X-Business-Id' => $business->id])
            ->getJson('/protected/business/users');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.email', $owner->email)
            ->assertJsonPath('data.1.email', $admin->email);
    }

    public function test_can_update_user_role()
    {
        $business = Business::create(['name' => 'Test Business']);
        $owner = User::factory()->create();
        $cashier = User::factory()->create();

        $business->users()->attach($owner->id, ['role' => BusinessUser::ROLE_OWNER]);
        $business->users()->attach($cashier->id, ['role' => BusinessUser::ROLE_CASHIER]);

        $this->actingAs($owner);

        $response = $this->withHeaders(['X-Business-Id' => $business->id])
            ->putJson("/protected/business/users/{$cashier->id}", [
                'role' => BusinessUser::ROLE_ADMIN,
            ]);

        $response->assertStatus(200);
        $this->assertEquals(
            BusinessUser::ROLE_ADMIN,
            BusinessUser::where('business_id', $business->id)->where('user_id', $cashier->id)->first()->role
        );
    }

    public function test_cannot_downgrade_last_owner()
    {
        $business = Business::create(['name' => 'Test Business']);
        $owner = User::factory()->create();

        $business->users()->attach($owner->id, ['role' => BusinessUser::ROLE_OWNER]);

        $this->actingAs($owner);

        $response = $this->withHeaders(['X-Business-Id' => $business->id])
            ->putJson("/protected/business/users/{$owner->id}", [
                'role' => BusinessUser::ROLE_ADMIN,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'No podés cambiar el rol del último propietario del negocio.');

        $this->assertEquals(
            BusinessUser::ROLE_OWNER,
            BusinessUser::where('business_id', $business->id)->where('user_id', $owner->id)->first()->role
        );
    }

    public function test_can_downgrade_owner_if_another_exists()
    {
        $business = Business::create(['name' => 'Test Business']);
        $owner1 = User::factory()->create();
        $owner2 = User::factory()->create();

        $business->users()->attach($owner1->id, ['role' => BusinessUser::ROLE_OWNER]);
        $business->users()->attach($owner2->id, ['role' => BusinessUser::ROLE_OWNER]);

        $this->actingAs($owner1);

        $response = $this->withHeaders(['X-Business-Id' => $business->id])
            ->putJson("/protected/business/users/{$owner1->id}", [
                'role' => BusinessUser::ROLE_ADMIN,
            ]);

        $response->assertStatus(200);
        $this->assertEquals(
            BusinessUser::ROLE_ADMIN,
            BusinessUser::where('business_id', $business->id)->where('user_id', $owner1->id)->first()->role
        );
    }

    public function test_cannot_promote_to_owner()
    {
        $business = Business::create(['name' => 'Test Business']);
        $owner = User::factory()->create();
        $admin = User::factory()->create();

        $business->users()->attach($owner->id, ['role' => BusinessUser::ROLE_OWNER]);
        $business->users()->attach($admin->id, ['role' => BusinessUser::ROLE_ADMIN]);

        $this->actingAs($owner);

        $response = $this->withHeaders(['X-Business-Id' => $business->id])
            ->putJson("/protected/business/users/{$admin->id}", [
                'role' => BusinessUser::ROLE_OWNER,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'El rol propietario solo puede asignarse manualmente por base de datos');

        $this->assertEquals(
            BusinessUser::ROLE_ADMIN,
            BusinessUser::where('business_id', $business->id)->where('user_id', $admin->id)->first()->role
        );
    }

    public function test_cannot_update_with_invalid_role()
    {
        $business = Business::create(['name' => 'Test Business']);
        $owner = User::factory()->create();
        $admin = User::factory()->create();

        $business->users()->attach($owner->id, ['role' => BusinessUser::ROLE_OWNER]);
        $business->users()->attach($admin->id, ['role' => BusinessUser::ROLE_ADMIN]);

        $this->actingAs($owner);

        $response = $this->withHeaders(['X-Business-Id' => $business->id])
            ->putJson("/protected/business/users/{$admin->id}", [
                'role' => 'invalid_role',
            ]);

        $response->assertStatus(422);
    }
}
