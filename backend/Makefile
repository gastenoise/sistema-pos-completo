.PHONY: up down up-nocache composer-install migrate seed dbreset test bash keygen artisan-cache all

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