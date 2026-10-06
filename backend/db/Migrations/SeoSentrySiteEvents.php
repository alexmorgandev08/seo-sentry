<?php

use SeoSentry\Config;
use SeoSentry\Deps\BitApps\WPDatabase\Blueprint;
use SeoSentry\Deps\BitApps\WPDatabase\Connection;
use SeoSentry\Deps\BitApps\WPDatabase\Schema;
use SeoSentry\Deps\BitApps\WPKit\Migration\Migration;

if (!defined('ABSPATH')) {
    exit;
}

final class SeoSentrySiteEvents extends Migration
{
    public function up(): void
    {
        Schema::withPrefix(Connection::wpPrefix() . Config::VAR_PREFIX)->create(
            'events',
            function (Blueprint $table): void {
                $table->id();
                $table->varchar('event_type')->length(64)->index();
                $table->varchar('subject')->length(191)->nullable();
                $table->longtext('details')->nullable();
                $table->timestamps();
            }
        );
    }

    public function down(): void
    {
        Schema::withPrefix(Connection::wpPrefix() . Config::VAR_PREFIX)->drop('events');
    }
}
