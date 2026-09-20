<?php

namespace SEOChangeMonitor\src;

if (!defined('ABSPATH')) {
    exit;
}

use SEOChangeMonitor\Config;
use SEOChangeMonitor\Views\Body;

final class Menu
{
    public static function getSideBarMenu(Body $body)
    {
        $menu = [
            'Home' => [
                'type'       => 'menu',
                'title'      => Config::TITLE,
                'name'       => Config::TITLE,
                'capability' => 'manage_options',
                'slug'       => Config::SLUG,
                'callback'   => [$body, 'render'],
                'icon'       => 'dashicons-shield-alt',
                'position'   => '20',
            ],
        ];

        // Submenu entries point at the same admin page with a hash route, so
        // the React app navigates without a page load.
        $routes = [
            ''        => __('Dashboard', 'seo-sentry'),
            '#/pages' => __('Monitored Pages', 'seo-sentry'),
            '#/log'   => __('Change History', 'seo-sentry'),
            '#/site'  => __('Site Checks', 'seo-sentry'),
        ];

        /*
         * Integrations is a pro screen. The React router only registers that
         * route when the add-on is active, so listing it unconditionally here
         * gave WordPress a submenu entry that opened a blank page. Same test
         * the localized config uses to hide the tab in the app's own nav.
         */
        if (defined('SEO_CHANGE_MONITOR_PRO_VERSION')) {
            $routes['#/integrations'] = __('Integrations', 'seo-sentry');
        }

        $routes['#/settings'] = __('Settings', 'seo-sentry');

        foreach ($routes as $route => $label) {
            $menu['submenu' . $route] = [
                'type'       => 'submenu',
                'parent'     => Config::SLUG,
                'title'      => $label,
                'name'       => $label,
                'capability' => 'manage_options',
                'slug'       => Config::SLUG . $route,
            ];
        }

        return $menu;
    }
}
