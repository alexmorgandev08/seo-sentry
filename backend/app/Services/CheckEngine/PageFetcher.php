<?php

namespace SeoSentry\Services\CheckEngine;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Config;

class PageFetcher
{
    public function fetch($url)
    {
        $result = new FetchResult();

        $response = wp_remote_get(
            $url,
            [
                'timeout'     => 15,
                'redirection' => 0, // record the redirect target, never follow it
                'user-agent'  => 'SeoSentry/' . Config::VERSION . '; ' . home_url('/'),
                // Certificates are verified. A site behind a self-signed cert -
                // staging, or a local install - can switch that off here rather
                // than through WordPress's own https_ssl_verify.
                'sslverify'   => apply_filters(Config::withPrefix('ssl_verify'), true),
            ]
        );

        if (is_wp_error($response)) {
            $result->error = $response->get_error_message();

            return $result;
        }

        $result->status = (int) wp_remote_retrieve_response_code($response);
        $result->body   = (string) wp_remote_retrieve_body($response);

        // An empty "200 OK" is not a page, a robots.txt or a sitemap. Some hosts
        // answer a site's requests to itself like this (a firewall or a cache in
        // front of WordPress). Counted as a success, it reported an all-clear
        // for a check that read nothing.
        if ($result->status >= 200 && $result->status < 300 && trim($result->body) === '') {
            $result->error = sprintf(
                /* translators: %d: HTTP status code, for example 200 */
                __('The server sent an empty response (HTTP %d).', 'seo-sentry'),
                $result->status
            );
        }

        $headers = wp_remote_retrieve_headers($response);
        if (\is_object($headers) && method_exists($headers, 'getAll')) {
            $result->headers = $headers->getAll();
        } elseif (\is_array($headers)) {
            $result->headers = $headers;
        }

        $location = wp_remote_retrieve_header($response, 'location');
        if ($location) {
            $result->redirectTarget = \is_array($location) ? end($location) : $location;
        }

        return $result;
    }

    /**
     * Loopback probe: can this site fetch itself at all?
     */
    public function preflight()
    {
        $result = $this->fetch(home_url('/'));

        return !$result->isTransportError();
    }
}
