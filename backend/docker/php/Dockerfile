FROM php:8.2-fpm

RUN pecl install redis \
    && docker-php-ext-enable redis

RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    default-mysql-client

RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY ./docker/php/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www

# Crear usuario para evitar problemas de permisos
RUN groupadd -g 1000 www
RUN useradd -u 1000 -ms /bin/bash -g www www

USER www

EXPOSE 9000
CMD ["php-fpm"]