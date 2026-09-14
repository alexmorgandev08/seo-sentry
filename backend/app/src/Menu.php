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
                'icon'       => 'dashicons-visibility',
                'position'   => '20',
            ],
        ];

        // Submenu entries point at the same admin page with a hash route, so
        // the React app navigates without a page load.
        $routes = [
            ''               => __('Dashboard', 'seo-sentry'),
            '#/pages'        => __('Monitored Pages', 'seo-sentry'),
            '#/log'          => __('Flight Log', 'seo-sentry'),
            '#/site'         => __('Site-wide', 'seo-sentry'),
            '#/integrations' => __('Integrations', 'seo-sentry'),
            '#/settings'     => __('Settings', 'seo-sentry'),
        ];

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
