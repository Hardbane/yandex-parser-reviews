<?php

namespace App\Services\YandexMaps;

use App\Data\YandexMaps\ParsedOrganizationData;

interface YandexMapsParserInterface
{
    public function parse(string $url): ParsedOrganizationData;
}
