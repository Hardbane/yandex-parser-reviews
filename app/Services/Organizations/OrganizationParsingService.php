<?php

namespace App\Services\Organizations;

use App\Models\Organization;
use App\Models\Review;
use App\Services\YandexMaps\YandexMapsParserInterface;
use Illuminate\Support\Facades\DB;

class OrganizationParsingService
{
    public function __construct(
        private readonly YandexMapsParserInterface $parser,
    ) {}

    public function parseAndSave(Organization $organization): Organization
    {
        $organization->update([
            'parse_status' => 'parsing',
            'parse_error' => null,
        ]);

        try {
            $parsed = $this->parser->parse($organization->yandex_url);

            DB::transaction(function () use ($organization, $parsed) {
                $organization->update([
                    'title' => $parsed->title,
                    'rating' => $parsed->rating,
                    'ratings_count' => $parsed->ratingsCount,
                    'reviews_count' => $parsed->reviewsCount,
                    'parse_status' => 'success',
                    'parse_error' => null,
                    'parsed_at' => now(),
                ]);

                $organization->reviews()->delete();

                foreach ($parsed->reviews as $review) {
                    Review::updateOrCreate(
                        [
                            'organization_id' => $organization->id,
                            'external_id' => $review->externalId,
                        ],
                        [
                            'author' => $review->author,
                            'review_date' => $review->date,
                            'text' => $review->text,
                            'rating' => $review->rating,
                        ]
                    );
                }
            });
        } catch (\Throwable $e) {

            $message = $e->getMessage();

            if (str_contains($message, 'Timeout')) {
                $message = 'Превышено время ожидания ответа Яндекс.Карт';
            }

            if (str_contains($message, 'ERR_NAME_NOT_RESOLVED')) {
                $message = 'Не удалось открыть страницу организации';
            }

            if (str_contains($message, 'captcha')) {
                $message = 'Яндекс запросил CAPTCHA. Повторите позже';
            }

            $organization->update([
                'parse_status' => 'failed',
                'parse_error' => $message,
            ]);
        }
        return $organization->refresh();
    }
}
