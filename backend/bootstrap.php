<?php

use SeoSentry\Dotenv;
use SeoSentry\Plugin;
use SeoSentry\src\CLI\Commands;

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

Dotenv::load(plugin_dir_path(__DIR__) . '.env');

Plugin::load();

if (defined('WP_CLI') && WP_CLI) {
    Commands::register();
}
