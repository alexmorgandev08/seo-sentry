<?php

namespace SeoSentry\Models;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Config;
use SeoSentry\Deps\BitApps\WPDatabase\Model;

class BotVisit extends Model
{
    protected $prefix = Config::VAR_PREFIX;

    protected $casts = ['id' => 'int', 'hits' => 'int'];

    protected $fillable = ['bot_slug', 'first_seen_at', 'last_seen_at', 'hits'];
}
