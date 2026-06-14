<?php

namespace App\Http\Controllers\Api;

use App\Jobs\ParseYandexOrganizationJob;
use App\Services\Organizations\OrganizationParsingService;
use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function show(Request $request)
    {
        $organization = Organization::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->first();

        return response()->json([
            'organization' => $organization,
        ]);
    }

    public function store(Request $request)
    {

        $data = $request->validate([
            'yandex_url' => [
                'required',
                'string',
                'max:2048',
                'url',
                'regex:/^https?:\/\/(yandex\.[a-z]+|www\.yandex\.[a-z]+|yandex\.ru|yandex\.com)\/maps\//i',
            ],
        ], [
            'yandex_url.regex' => 'Введите ссылку на организацию в Яндекс.Картах.',
        ]);

        $organization = Organization::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'yandex_url' => $data['yandex_url'],
                'parse_status' => 'saved',
                'parse_error' => null,
            ]
        );

        ParseYandexOrganizationJob::dispatch($organization->id);

        return response()->json([
            'organization' => $organization->refresh(),
            'message' => 'Ссылка сохранена, парсинг запущен',
        ]);
    }

    public function refresh(Request $request)
    {
        $organization = Organization::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->firstOrFail();

        $organization->update([
            'parse_status' => 'parsing',
            'parse_error' => null,
        ]);

        if (
            $organization->parsed_at &&
            $organization->parsed_at->gt(now()->subMinutes(10))
        ) {
            return response()->json([
                'organization' => $organization,
                'message' => 'Отзывы уже недавно обновлялись. Повторите позже.',
            ], 429);
        }

        ParseYandexOrganizationJob::dispatch($organization->id);

        return response()->json([
            'organization' => $organization->refresh(),
            'message' => 'Обновление отзывов запущено',
        ]);
    }
}
