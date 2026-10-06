<?php

namespace SeoSentry\Views;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Config;

class Body
{
    public function render()
    {
        echo '<div id="seo-sentry-root"></div>';
    }
}
