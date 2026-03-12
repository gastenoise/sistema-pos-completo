#!/bin/sh

# Replace the port in the Nginx config
sed -i "s/\${PORT}/${PORT:-80}/g" /etc/nginx/nginx.conf

# Start PHP-FPM in the background
php-fpm -D

# Start Nginx in the foreground
nginx -g "daemon off;"
