<?php

namespace App\Data\YandexMaps;

class ParsedOrganizationData
{
    /**
     * @param ParsedReviewData[] $reviews
     */
    public function __construct(
        public readonly ?string $title,
        public readonly ?float $rating,
        public readonly int $ratingsCount,
        public readonly int $reviewsCount,
        public readonly array $reviews,
    ) {}
}
