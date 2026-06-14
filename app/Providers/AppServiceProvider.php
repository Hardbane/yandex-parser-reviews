<?php

namespace App\Providers;

use App\Services\YandexMaps\PlaywrightYandexMapsParserService;
use App\Services\YandexMaps\YandexMapsParserInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            YandexMapsParserInterface::class,
            PlaywrightYandexMapsParserService::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
