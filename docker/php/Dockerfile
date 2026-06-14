FROM php:8.5-fpm

RUN apt-get update && apt-get install -y \
    git unzip curl zip \
    libzip-dev libpq-dev libicu-dev \
    nodejs npm \
    chromium \
    && docker-php-ext-install pdo pdo_mysql zip intl \
    && apt-get clean

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
