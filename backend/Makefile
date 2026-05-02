.PHONY: up down up-nocache composer-install migrate seed dbreset test bash keygen artisan-cache all sepa-sync reset-password reset-password-local

up:
	docker compose up -d

down:
	docker compose down

up-nocache:
	docker compose down
	docker compose build --no-cache
	docker compose up -d

composer-install:
	docker compose run --rm app composer install

migrate:
	docker compose exec app php artisan migrate

seed:
	docker compose exec app php artisan db:seed

refresh-db:
	docker compose exec app php artisan migrate:fresh
	docker compose exec app php artisan db:seed

test:
	docker compose exec app php artisan test

bash:
	docker compose exec app bash

keygen:
	docker compose exec app php artisan key:generate

artisan-cache:
	docker compose exec app php artisan cache:clear
	docker compose exec app php artisan config:clear
	docker compose exec app php artisan route:clear
	docker compose exec app php artisan view:clear

setup: up-nocache composer-install refresh-db keygen artisan-cache

sepa-sync:
	docker compose exec app php artisan sepa:sync --sync

# Cambiar contraseña de usuario con Docker (desarrollo local)
# Uso: make reset-password email=usuario@email.com password=nueva_password
# Si no proporciona password, se le pedirá de forma interactiva.
reset-password:
	@echo "=== Cambiar contraseña con Docker ==="
	@if [ -z "$(email)" ]; then \
		echo "Error: Debe proporcionar el email. Ejemplo: make reset-password email=usuario@email.com"; \
		exit 1; \
	fi
	@if [ -n "$(password)" ]; then \
		docker compose exec -T app php artisan user:reset-password --email=$(email) --password=$(password); \
	else \
		docker compose exec app php artisan user:reset-password --email=$(email); \
	fi

# Cambiar contraseña de usuario SIN Docker (producción o conexión directa a DB)
# Uso: make reset-password-local email=usuario@email.com password=nueva_password
# Requiere tener PHP y las dependencias instaladas localmente, y el .env configurado para la DB productiva
reset-password-local:
	@echo "=== Cambiar contraseña localmente (sin Docker) ==="
	@if [ -z "$(email)" ]; then \
		echo "Error: Debe proporcionar el email. Ejemplo: make reset-password-local email=usuario@email.com"; \
		exit 1; \
	fi
	@if [ -n "$(password)" ]; then \
		cd /workspace/backend && php artisan user:reset-password --email=$(email) --password=$(password); \
	else \
		cd /workspace/backend && php artisan user:reset-password --email=$(email); \
	fi