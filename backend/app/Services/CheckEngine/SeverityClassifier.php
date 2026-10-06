<?php

namespace SeoSentry\Services\CheckEngine;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Models\Finding;

class SeverityClassifier
{
    /**
     * @return string critical|warning|info
     */
    public function classify(Change $change, DiffContext $context)
    {
        $severity = ChangeTypes::baseSeverity($change->type);

        if ($context->expected && \in_array($change->type, ChangeTypes::EXPECTED_DOWNGRADABLE, true)) {
            return Finding::SEVERITY_INFO;
        }

        return $severity;
    }
}
