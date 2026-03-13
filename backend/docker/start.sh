#!/bin/sh

set -eu

# Configuration
MAX_ATTEMPTS=60
SLEEP=2

# Replace port in nginx config (Render uses $PORT)
sed -i "s/\${PORT}/${PORT:-80}/g" /etc/nginx/nginx.conf

# Wait for database to be ready
echo "Waiting for database to be ready..."
attempt=0
until php -r 'try {
    $driver = getenv("DB_CONNECTION") ?: "pgsql";
    $host = getenv("DB_HOST") ?: "127.0.0.1";
    $port = getenv("DB_PORT") ?: 5432;
    $db   = getenv("DB_DATABASE") ?: "";
    $user = getenv("DB_USERNAME") ?: "";
    $pass = getenv("DB_PASSWORD") ?: "";
    $dsn = "{$driver}:host={$host};port={$port};dbname={$db}";
    new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "ok";
} catch (Exception $e) { exit(1); }' >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "WARNING: Database did not become available. Continuing startup..."
    break
  fi
  echo "Database not ready yet (attempt $attempt/$MAX_ATTEMPTS). Sleeping ${SLEEP}s..."
  sleep "$SLEEP"
done

# Fix permissions
echo "Fixing permissions..."
chown -R www-data:www-data storage bootstrap/cache || true
chmod -R 775 storage bootstrap/cache || true

# Cache Laravel configuration and routes
echo "Caching configuration and routes..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Start PHP-FPM and Nginx
echo "Starting php-fpm..."
php-fpm -D

echo "Starting nginx..."
nginx -g "daemon off;"