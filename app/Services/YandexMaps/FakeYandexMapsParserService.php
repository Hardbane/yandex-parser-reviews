<?php

namespace App\Services\YandexMaps;

use App\Data\YandexMaps\ParsedOrganizationData;
use App\Data\YandexMaps\ParsedReviewData;
use Illuminate\Support\Carbon;

class FakeYandexMapsParserService implements YandexMapsParserInterface
{
    public function parse(string $url): ParsedOrganizationData
    {
        $reviews = [];

        for ($i = 1; $i <= 123; $i++) {
            $reviews[] = new ParsedReviewData(
                externalId: 'fake-' . $i,
                author: 'Автор ' . $i,
                date: Carbon::now()->subDays($i)->toDateString(),
                text: 'Это тестовый отзыв номер ' . $i . '. Позже мы заменим эти данные на реальные отзывы из Яндекс.Карт.',
                rating: rand(3, 5),
            );
        }

        return new ParsedOrganizationData(
            title: 'Тестовая организация из Яндекс.Карт',
            rating: 4.7,
            ratingsCount: 187,
            reviewsCount: count($reviews),
            reviews: $reviews,
        );
    }
}
