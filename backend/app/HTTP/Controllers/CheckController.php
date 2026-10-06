<?php

namespace SeoSentry\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Deps\BitApps\WPKit\Http\Response;
use SeoSentry\Models\CheckRun;
use SeoSentry\Services\CheckEngine\CheckRunner;

class CheckController
{
    public function checkNow()
    {
        $runner = new CheckRunner();
        $run    = $runner->runSync('manual');

        if (!$run) {
            return Response::error(__('Could not start the check.', 'seo-sentry'));
        }

        return Response::success($run);
    }

    public function runStatus()
    {
        $run = CheckRun::orderBy('id')->desc()->first();

        return Response::success($run ?: null);
    }
}
