<?php

namespace SeoSentry\src;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Config;
use SeoSentry\Views\Body;

final class Menu
{
    public static function getSideBarMenu(Body $body)
    {
        $title = Config::hasProLicense() ? __('SEO Sentry Pro', 'seo-sentry') : Config::TITLE;

        $menu = [
            'Home' => [
                'type'       => 'menu',
                'title'      => $title,
                'name'       => $title,
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
            ''               => __('Dashboard', 'seo-sentry'),
            '#/pages'        => __('Monitored Pages', 'seo-sentry'),
            '#/log'          => __('Change History', 'seo-sentry'),
            '#/site'         => __('Site Checks', 'seo-sentry'),
            // A pro screen, listed either way like the app's own nav: without
            // pro it shows what the feature adds.
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
