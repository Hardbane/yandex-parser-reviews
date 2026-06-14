<?php

use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('/api/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/api/me', [AuthController::class, 'me']);
    Route::post('/api/logout', [AuthController::class, 'logout']);

    Route::get('/api/organization', [OrganizationController::class, 'show']);
    Route::post('/api/organization', [OrganizationController::class, 'store']);

    Route::get('/api/reviews', [ReviewController::class, 'index']);
    Route::post('/api/organization/refresh', [OrganizationController::class, 'refresh']);
});

Route::view('/{any}', 'welcome')->where('any', '.*');
