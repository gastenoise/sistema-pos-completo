.PHONY: up down up-nocache composer-install migrate seed dbreset test bash keygen artisan-cache all sepa-sync env-file wait-db

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

env-file:
	@if [ ! -f .env ]; then cp .env.example .env; fi

wait-db:
	@echo "Waiting for database..."
	@docker compose exec app php -r 'for ($$i=0; $$i<60; $$i++) { try { \
		$$driver = getenv("DB_CONNECTION") ?: "pgsql"; \
		$$host = getenv("DB_HOST") ?: "127.0.0.1"; \
		$$port = getenv("DB_PORT") ?: 5432; \
		$$db   = getenv("DB_DATABASE") ?: ""; \
		$$user = getenv("DB_USERNAME") ?: ""; \
		$$pass = getenv("DB_PASSWORD") ?: ""; \
		$$dsn = "$$driver:host=$$host;port=$$port;dbname=$$db"; \
		new PDO($$dsn, $$user, $$pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]); \
		exit(0); \
	} catch (Exception $$e) { sleep(2); } } exit(1);'

setup: env-file up-nocache composer-install wait-db refresh-db keygen artisan-cache

sepa-sync:
	docker compose exec app php artisan sepa:sync --sync