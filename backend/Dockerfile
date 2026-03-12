# Stage 1: PHP Dependencies
FROM php:8.3-fpm-alpine as php-build

# Install dependencies
RUN apk add --no-cache \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    libzip-dev \
    unzip \
    oniguruma-dev \
    icu-dev

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql mbstring bcmath ctype fileinfo xml zip opcache intl

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy only composer files first for better caching
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Stage 2: Node.js for Vite Assets
FROM node:20-alpine as node-build

WORKDIR /var/www

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 3: Production
FROM php:8.3-fpm-alpine

# Install Nginx and other runtime dependencies
RUN apk add --no-cache \
    nginx \
    libpng \
    libzip \
    oniguruma \
    icu-libs

# Install PHP extensions needed at runtime (must match build stage)
RUN docker-php-ext-install pdo pdo_mysql mbstring bcmath ctype fileinfo xml zip opcache intl

WORKDIR /var/www

# Copy application files
COPY . .

# Copy vendor from php-build stage
COPY --from=php-build /var/www/vendor /var/www/vendor

# Copy built assets from node-build stage
COPY --from=node-build /var/www/public/build /var/www/public/build

# Copy Nginx config
COPY docker/nginx-render.conf /etc/nginx/conf.d/default.conf

# Copy start script
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Fix permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# Render requirement: listen on $PORT
EXPOSE 80

CMD ["/usr/local/bin/start.sh"]
