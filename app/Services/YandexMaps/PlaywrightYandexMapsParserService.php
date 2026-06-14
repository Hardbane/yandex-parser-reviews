<?php

namespace App\Services\YandexMaps;

use App\Data\YandexMaps\ParsedOrganizationData;
use App\Data\YandexMaps\ParsedReviewData;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class PlaywrightYandexMapsParserService implements YandexMapsParserInterface
{
    public function parse(string $url): ParsedOrganizationData
    {
        $result = Process::timeout(300)->run([
            'node',
            base_path('parser/yandex-parser.cjs'),
            $url,
        ]);

        if (! $result->successful()) {
            throw new RuntimeException(
                $result->errorOutput() ?: 'Playwright parser failed'
            );
        }

        $data = json_decode($result->output(), true);

        if (! is_array($data)) {
            throw new RuntimeException('Parser returned invalid JSON');
        }

        if (isset($data['error'])) {
            throw new RuntimeException($data['error']);
        }

        $reviews = collect($data['reviews'] ?? [])
            ->map(fn (array $review) => new ParsedReviewData(
                externalId: $review['externalId'] ?? null,
                author: $review['author'] ?? null,
                date: null,
                text: $review['text'] ?? null,
                rating: $review['rating'] ?? null,
            ))
            ->all();

        return new ParsedOrganizationData(
            title: $data['title'] ?? null,
            rating: isset($data['rating']) ? (float) $data['rating'] : null,
            ratingsCount: (int) ($data['ratingsCount'] ?? 0),
            reviewsCount: (int) ($data['reviewsCount'] ?? count($reviews)),
            reviews: $reviews,
        );
    }
}
