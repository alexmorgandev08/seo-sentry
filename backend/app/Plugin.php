<?php

namespace SeoSentry;

if (!defined('ABSPATH')) {
    exit;
}

// Prevent direct script access

use SeoSentry\Deps\BitApps\WPKit\Hooks\Hooks;
use SeoSentry\Deps\BitApps\WPKit\Http\RequestType;
use SeoSentry\Deps\BitApps\WPKit\Migration\MigrationHelper;
use SeoSentry\Deps\BitApps\WPKit\Utils\Capabilities;
use SeoSentry\HTTP\Middleware\AdminCheckerMiddleware;
use SeoSentry\HTTP\Middleware\NonceCheckerMiddleware;
use SeoSentry\Providers\BotTrackerProvider;
use SeoSentry\Providers\CronProvider;
use SeoSentry\Providers\EventRecorderProvider;
use SeoSentry\Providers\HookProvider;
use SeoSentry\Providers\InstallerProvider;
use SeoSentry\Providers\SetupProvider;
use SeoSentry\src\DashboardWidget;
use SeoSentry\src\NetworkDashboard;
use SeoSentry\src\SiteHealth;
use SeoSentry\Views\HtmlTagModifier;
use SeoSentry\Views\Layout;
use SeoSentry\Views\PluginPageActions;

final class Plugin
{
    private static $_instance;

    private $_registeredMiddleware = [];

    public function __construct()
    {
        $this->registerInstaller();

        Hooks::addAction('plugins_loaded', [$this, 'loaded']);
    }

    public function registerInstaller()
    {
        $installerProvider = new InstallerProvider();
        $installerProvider->register();

        new SetupProvider();
    }

    public function loaded()
    {
        Hooks::doAction(Config::withPrefix('loaded'));

        Hooks::addAction('init', [$this, 'registerProviders'], 8);

        Hooks::addFilter('plugin_action_links_' . Config::get('BASENAME'), [new PluginPageActions(), 'renderActionLinks']);

        self::maybeMigrateDB();
    }

    public function middlewares()
    {
        return [
            'nonce'   => NonceCheckerMiddleware::class,
            'isAdmin' => AdminCheckerMiddleware::class,
        ];
    }

    public function getMiddleware($name)
    {
        if (isset($this->_registeredMiddleware[$name])) {
            return $this->_registeredMiddleware[$name];
        }

        $middlewares = $this->middlewares();

        if (isset($middlewares[$name]) && class_exists($middlewares[$name]) && method_exists($middlewares[$name], 'handle')) {
            $this->_registeredMiddleware[$name] = new $middlewares[$name]();
        } else {
            return false;
        }

        return $this->_registeredMiddleware[$name];
    }

    public function registerProviders()
    {
        if (RequestType::is('admin')) {
            new Layout();
            new HtmlTagModifier();
            new SiteHealth();
            new DashboardWidget();

            if (is_multisite()) {
                new NetworkDashboard();
            }
        }

        // Cron and event capture must run on every request type, not just admin.
        new CronProvider();
        new EventRecorderProvider();

        if (RequestType::is('frontend')) {
            new BotTrackerProvider();
        }

        new HookProvider();
    }

    public static function maybeMigrateDB()
    {
        if (!Capabilities::check('manage_options')) {
            return;
        }

        if (version_compare(Config::getOption('db_version'), Config::DB_VERSION, '<')) {
            MigrationHelper::migrate(InstallerProvider::migration());
        }
    }

    public static function instance()
    {
        return self::$_instance;
    }

    public static function load()
    {
        if (self::$_instance !== null) {
            return false;
        }

        self::$_instance = new self();

        return true;
    }
}
