<?php

namespace SeoSentry\Models;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Config;
use SeoSentry\Deps\BitApps\WPDatabase\Model;

class SiteEvent extends Model
{
    protected $table = 'events';

    protected $prefix = Config::VAR_PREFIX;

    protected $casts = ['id' => 'int'];

    protected $fillable = ['event_type', 'subject', 'details'];
}
