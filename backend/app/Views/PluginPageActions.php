<?php

namespace SeoSentry\Views;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Config;

class PluginPageActions
{
    public function getActionLinks()
    {
        return [
            [
                'url'   => admin_url('admin.php?page=' . Config::SLUG . '#/settings'),
                'title' => __('Settings', 'seo-sentry'),
            ],
            [
                'url'   => 'https://wordpress.org/support/plugin/seo-sentry/',
                'title' => __('Support', 'seo-sentry'),
            ],
        ];
    }

    public function renderActionLinks($links)
    {
        $actionLinks = [];
        foreach ($this->getActionLinks() as $link) {
            $actionLinks[] = '<a href="' . esc_url($link['url']) . '">' . esc_html($link['title']) . '</a>';
        }

        return array_merge($actionLinks, $links);
    }
}
