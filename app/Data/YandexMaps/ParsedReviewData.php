<?php

namespace App\Data\YandexMaps;

class ParsedReviewData
{
    public function __construct(
        public readonly ?string $externalId,
        public readonly ?string $author,
        public readonly ?string $date,
        public readonly ?string $text,
        public readonly ?int $rating,
    ) {}
}
