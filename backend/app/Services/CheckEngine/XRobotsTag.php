<?php

namespace SeoSentry\Services\CheckEngine;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Reads the X-Robots-Tag response header: the same instructions as the robots
 * meta tag, sent by the server instead of the page.
 *
 * It matters because it is invisible in the page source. A security plugin,
 * a CDN rule or a line of server config can noindex a page while the HTML
 * still looks perfectly indexable.
 */
class XRobotsTag
{
    /** Directives that themselves contain a colon, so "name:" is not a bot name. */
    private const COLON_DIRECTIVES = ['unavailable_after', 'max-snippet', 'max-image-preview', 'max-video-preview'];

    /**
     * Bots whose instructions count. A rule aimed at one niche crawler should
     * not raise a critical "your page left Google" alarm.
     */
    private const SEARCH_BOTS = ['googlebot', 'bingbot'];

    /**
     * Every X-Robots-Tag header on the response, normalised and sorted so the
     * same headers always hash the same.
     *
     * @param array $headers response headers; values may be strings or lists
     *
     * @return string[]
     */
    public static function fromHeaders(array $headers)
    {
        $values = [];

        foreach ($headers as $name => $value) {
            if (strtolower((string) $name) !== 'x-robots-tag') {
                continue;
            }

            foreach ((array) $value as $line) {
                $line = strtolower(trim(preg_replace('/\s+/', ' ', (string) $line)));
                if ($line !== '') {
                    $values[] = $line;
                }
            }
        }

        sort($values);

        return array_values(array_unique($values));
    }

    /**
     * Does any header tell all bots, Googlebot or Bingbot not to index?
     *
     * @param string[] $values as returned by fromHeaders()
     */
    public static function blocksIndexing(array $values)
    {
        return self::hasDirective($values, 'noindex');
    }

    /**
     * Does any header aimed at every crawler, Googlebot or Bingbot carry this
     * directive? "none" is shorthand for "noindex, nofollow", so it counts for
     * both of those.
     *
     * @param string[] $values    as returned by fromHeaders()
     * @param string   $directive e.g. "noindex", "nofollow"
     */
    public static function hasDirective(array $values, $directive)
    {
        foreach ($values as $value) {
            [$bot, $directives] = self::split($value);

            if ($bot !== null && !\in_array($bot, self::SEARCH_BOTS, true)) {
                continue;
            }

            if (\in_array($directive, $directives, true) || \in_array('none', $directives, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * "googlebot: noindex, nofollow" => ['googlebot', ['noindex', 'nofollow']].
     * With no bot prefix the bot is null, meaning every crawler.
     *
     * @return array{0: null|string, 1: string[]}
     */
    private static function split($value)
    {
        $bot = null;

        if (preg_match('/^([a-z0-9._-]+)\s*:\s*(.*)$/', $value, $m) && !\in_array($m[1], self::COLON_DIRECTIVES, true)) {
            $bot   = $m[1];
            $value = $m[2];
        }

        // Keep only the directive name: "max-snippet: 50" => "max-snippet".
        $directives = array_map(
            static fn ($part) => trim(explode(':', $part, 2)[0]),
            explode(',', $value)
        );

        return [$bot, array_values(array_filter($directives))];
    }
}
