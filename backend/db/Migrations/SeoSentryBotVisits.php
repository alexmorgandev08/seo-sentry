<?php

use SeoSentry\Config;
use SeoSentry\Deps\BitApps\WPDatabase\Blueprint;
use SeoSentry\Deps\BitApps\WPDatabase\Connection;
use SeoSentry\Deps\BitApps\WPDatabase\Schema;
use SeoSentry\Deps\BitApps\WPKit\Migration\Migration;

if (!defined('ABSPATH')) {
    exit;
}

final class SeoSentryBotVisits extends Migration
{
    public function up(): void
    {
        Schema::withPrefix(Connection::wpPrefix() . Config::VAR_PREFIX)->create(
            'bot_visits',
            function (Blueprint $table): void {
                $table->id();
                $table->varchar('bot_slug')->length(64)->index();
                $table->datetime('first_seen_at')->nullable();
                $table->datetime('last_seen_at')->nullable();
                $table->bigint('hits')->unsigned()->defaultValue(0);
                $table->timestamps();
            }
        );
    }

    public function down(): void
    {
        Schema::withPrefix(Connection::wpPrefix() . Config::VAR_PREFIX)->drop('bot_visits');
    }
}
