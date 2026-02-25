<?php

namespace App\Actions\Items;

class BuildImportEstimateAction
{
    public function __construct(private readonly ImportItemsAction $importItemsAction) {}

    public function execute(array $rows, int $businessId): array
    {
        return $this->importItemsAction->estimateMetrics($rows, $businessId, true, false);
    }
}
