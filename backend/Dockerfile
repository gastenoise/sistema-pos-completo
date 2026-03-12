# Stage 1: Base image with PHP extensions
FROM php:8.3-fpm-alpine AS base

# Install system dependencies and PHP extensions
RUN apk add --no-cache \
    libpng \
    libzip \
    oniguruma \
    icu-libs \
    curl

RUN apk add --no-cache --virtual .build-deps \
    libpng-dev \
    libxml2-dev \
    zip \
    libzip-dev \
    unzip \
    oniguruma-dev \
    icu-dev \
    $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_mysql mbstring bcmath ctype fileinfo xml zip opcache intl \
    && apk del .build-deps

WORKDIR /var/www

# Stage 2: PHP Dependencies
FROM base AS php-build

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy only composer files first for better caching
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Stage 3: Node.js for Vite Assets
FROM node:20-alpine AS node-build

WORKDIR /var/www

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 4: Production
FROM base AS production

# Install Nginx
RUN apk add --no-cache nginx

# Copy application files
COPY . .

# Copy vendor from php-build stage
COPY --from=php-build /var/www/vendor /var/www/vendor

# Copy built assets from node-build stage
COPY --from=node-build /var/www/public/build /var/www/public/build

# Copy Nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy start script
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Fix permissions
# We ensure both www-data (for PHP-FPM) and nginx (for Nginx) have access
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache && \
    chown -R nginx:nginx /var/www/public

# Render requirement: listen on $PORT
EXPOSE 80

CMD ["/usr/local/bin/start.sh"]
