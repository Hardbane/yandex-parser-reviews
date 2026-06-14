<?php

namespace App\Jobs;

use App\Models\Organization;
use App\Services\Organizations\OrganizationParsingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ParseYandexOrganizationJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function __construct(
        public int $organizationId
    ) {}

    public function handle(OrganizationParsingService $parsingService): void
    {
        $organization = Organization::findOrFail($this->organizationId);

        $parsingService->parseAndSave($organization);
    }
}
