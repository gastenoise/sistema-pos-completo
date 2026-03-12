#!/bin/sh

set -eu

# --- configuración ---
# tiempo máximo de espera por la DB (intentos)
MAX_ATTEMPTS=60
SLEEP=2

# --- reemplazo del puerto en el config de nginx (mantén tu conf con "${PORT}" literal) ---
sed -i "s/\${PORT}/${PORT:-80}/g" /etc/nginx/conf.d/default.conf

# --- esperar a que la DB acepte conexiones (MySQL) ---
echo "Waiting for DB to be ready..."
attempt=0
until php -r 'try {
    $host = getenv("DB_HOST") ?: "127.0.0.1";
    $port = getenv("DB_PORT") ?: 3306;
    $db   = getenv("DB_DATABASE") ?: "";
    $user = getenv("DB_USERNAME") ?: "";
    $pass = getenv("DB_PASSWORD") ?: "";
    new PDO("mysql:host={$host};port={$port};dbname={$db}", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "ok";
} catch (Exception $e) { exit(1); }' >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "WARNING: DB did not become available after $((MAX_ATTEMPTS * SLEEP))s — continuing startup (migrations may fail)."
    break
  fi
  echo "DB not ready yet (attempt $attempt/$MAX_ATTEMPTS). Sleeping ${SLEEP}s..."
  sleep "$SLEEP"
done

# --- permisos (fundamental) ---
echo "Fixing permissions..."
chown -R www-data:www-data storage bootstrap/cache || true
chmod -R 775 storage bootstrap/cache || true

# --- cache config & compiled files (seguro si falla no mata el container) ---
echo "Caching config and routes..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# --- migraciones (solo pendientes; --force para producción) ---
echo "Running migrations..."
php artisan migrate --force || echo "Migrations failed or nothing to run; continuing startup."

# --- arrancar servicios ---
echo "Starting php-fpm..."
php-fpm -D

echo "Starting nginx..."
nginx -g "daemon off;"