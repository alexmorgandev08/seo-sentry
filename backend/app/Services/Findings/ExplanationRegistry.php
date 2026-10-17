<?php

namespace SeoSentry\Services\Findings;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Config;
use SeoSentry\Services\CheckEngine\ChangeTypes;

/**
 * Pre-written plain-language explanations for every change type.
 * Each answers three questions: what happened, why it matters, what to check.
 * These render for every finding, with no API key and no external calls.
 */
class ExplanationRegistry
{
    /**
     * @param string $type    a ChangeTypes constant
     * @param array  $context optional context from the Change (ratio, removed types, bots…)
     *
     * @return array{what: string, why: string, check: string}
     */
    public static function get($type, array $context = [])
    {
        $all = self::templates($context);

        // An add-on explains the change types it registered itself.
        $explanation = $all[$type] ?? apply_filters(Config::withPrefix('explanation'), null, $type, $context);

        return $explanation ?? [
            'what'  => __('A value that SEO Sentry monitors on this page changed.', 'seo-sentry'),
            'why'   => __('A change to SEO data that you did not plan can have an effect on your search results.', 'seo-sentry'),
            'check' => __('Compare the before and after values above.', 'seo-sentry'),
        ];
    }

    private static function templates(array $ctx)
    {
        $ratioPct    = isset($ctx['ratio']) ? round($ctx['ratio'] * 100) : null;
        $removedList = isset($ctx['removed']) ? implode(', ', (array) $ctx['removed']) : '';
        $addedList   = isset($ctx['added']) ? implode(', ', (array) $ctx['added']) : '';
        $botsList    = isset($ctx['bots']) ? implode(', ', (array) $ctx['bots']) : '';

        return [
            ChangeTypes::TITLE_CHANGED => [
                'what'  => __('The page title changed. Google shows this title in search results, and browsers show it in tabs.', 'seo-sentry'),
                'why'   => __('The title has a large effect on rankings and on clicks. A change that you did not plan can decrease your rankings for the keywords of the old title.', 'seo-sentry'),
                'check' => __('If you did not edit this page, examine the title template in your SEO plugin. Also examine the plugins and themes that you updated recently.', 'seo-sentry'),
            ],
            ChangeTypes::TITLE_REMOVED => [
                'what'  => __('This page does not have a title tag now.', 'seo-sentry'),
                'why'   => __('Google will write its own headline for the page, and rankings usually decrease. A missing title is almost always an error in a template, not a decision.', 'seo-sentry'),
                'check' => __('Examine the header template of your theme and your SEO plugin. Usually, an update causes one of them to stop printing the title.', 'seo-sentry'),
            ],
            ChangeTypes::META_DESCRIPTION_CHANGED => [
                'what'  => __('The meta description changed. This is the short text below your headline in search results.', 'seo-sentry'),
                'why'   => __('The description does not have a direct effect on rankings. But it has an effect on whether people click your result or the result of a competitor.', 'seo-sentry'),
                'check' => __('If the new text looks incorrect or too general, examine the description field in your SEO plugin for this page.', 'seo-sentry'),
            ],
            ChangeTypes::META_DESCRIPTION_REMOVED => [
                'what'  => __('This page does not have a meta description now.', 'seo-sentry'),
                'why'   => __('Google will use random text from the page as the description. This text is usually less clear and gets fewer clicks.', 'seo-sentry'),
                'check' => __('Examine the description field in your SEO plugin for this page. Also examine if a recent plugin update deleted the description.', 'seo-sentry'),
            ],
            ChangeTypes::META_ROBOTS_CHANGED => [
                'what'  => __('The robots meta tag on this page changed. This tag gives instructions to search engine crawlers.', 'seo-sentry'),
                'why'   => __('These instructions control how search engines index the page and show it. This change does not block indexing, but it changes what crawlers do.', 'seo-sentry'),
                'check' => __('Compare the before and after values. If you did not plan this change, examine the advanced or robots settings in your SEO plugin for this page.', 'seo-sentry'),
            ],
            ChangeTypes::NOINDEX_ADDED => [
                'what'  => __('This page now tells search engines not to index it ("noindex").', 'seo-sentry'),
                'why'   => __('Google will remove this page from search results, usually in a few days. All search traffic to this page will stop.', 'seo-sentry'),
                'check' => __('Open the settings for this page in your SEO plugin. Find the indexing setting or the "allow search engines" setting. If you did not change it, a plugin that you updated or activated recently probably changed it.', 'seo-sentry'),
            ],
            ChangeTypes::NOINDEX_REMOVED => [
                'what'  => __('This page does not tell search engines to skip it now. Search engines can add it to their results again.', 'seo-sentry'),
                'why'   => __('If this page must stay hidden (for example, a thank-you page or a checkout page), it can now show in Google. If the noindex was a mistake, this change is good.', 'seo-sentry'),
                'check' => __('Make sure that you want this page to show in search results.', 'seo-sentry'),
            ],
            ChangeTypes::HEADER_NOINDEX_ADDED => [
                'what'  => __('Your server now tells search engines not to index this page. The server sends this instruction in an X-Robots-Tag header.', 'seo-sentry'),
                'why'   => __('Google will remove this page from search results, as with a noindex tag. This problem is harder to find. The server sends the instruction with the response, not in the page, so the page source looks correct.', 'seo-sentry'),
                'check' => __('Your SEO plugin settings do not show this header. Examine your security, caching and CDN plugins. Also examine the server rules of your host (.htaccess or nginx config) and all recent server changes.', 'seo-sentry'),
            ],
            ChangeTypes::HEADER_NOINDEX_REMOVED => [
                'what'  => __('Your server does not send a noindex instruction for this page in the X-Robots-Tag header now.', 'seo-sentry'),
                'why'   => __('Search engines can index this page again. If this page must stay hidden, it can now show in Google.', 'seo-sentry'),
                'check' => __('Make sure that you want this page to show in search results.', 'seo-sentry'),
            ],
            ChangeTypes::X_ROBOTS_TAG_CHANGED => [
                'what'  => __('The X-Robots-Tag header that your server sends for this page changed.', 'seo-sentry'),
                'why'   => __('This header gives the same instructions as the robots meta tag, for example nofollow or noarchive. But the server sends these instructions, not the page.', 'seo-sentry'),
                'check' => __('Compare the old and new values below. If nobody changed the server configuration, a security, caching or CDN plugin is usually the cause.', 'seo-sentry'),
            ],
            ChangeTypes::NOFOLLOW_ADDED => [
                'what'  => __('This page now tells search engines not to follow its links ("nofollow").', 'seo-sentry'),
                'why'   => __('The pages that this page links to do not get ranking credit from these links now. If this occurs on all pages of your site, the authority of every page can decrease without a notice.', 'seo-sentry'),
                'check' => __('Examine the advanced robots settings for this page in your SEO plugin. A nofollow for the full page is usually a mistake.', 'seo-sentry'),
            ],
            ChangeTypes::CANONICAL_CHANGED => [
                'what'  => __('The canonical URL of this page changed. This is the "official address" of the page for search engines.', 'seo-sentry'),
                'why'   => __('Google puts the ranking signals of a page on the canonical URL. If the canonical URL goes to the wrong address, the page can lose this credit, or the credit can go to the wrong page.', 'seo-sentry'),
                'check' => __('Make sure that the new canonical URL is the address that you want to rank. Examine the canonical field in your SEO plugin and your permalink settings.', 'seo-sentry'),
            ],
            ChangeTypes::CANONICAL_REMOVED => [
                'what'  => __('This page does not have a canonical URL tag now.', 'seo-sentry'),
                'why'   => __('Without this tag, search engines guess which of the similar URLs is the correct one. With URL parameters or pagination, they can guess incorrectly and divide your ranking credit.', 'seo-sentry'),
                'check' => __('Examine your SEO plugin first. SEO plugins add this tag automatically, so the plugin is possibly not active or its settings are incorrect.', 'seo-sentry'),
            ],
            ChangeTypes::CANONICAL_OFFSITE => [
                'what'  => __('This page now tells search engines that the "real" version of the page is on a different website.', 'seo-sentry'),
                'why'   => __('Google will probably remove this page from its index and give the credit to the other site. This is one of the most dangerous SEO failures, because it occurs without a notice.', 'seo-sentry'),
                'check' => __('Examine the canonical setting for this page in your SEO plugin. Also examine all recently activated plugins that control canonical URLs. If you did not set this, fix it immediately.', 'seo-sentry'),
            ],
            ChangeTypes::SCHEMA_TYPE_REMOVED => [
                'what'  => $removedList !== ''
                    /* translators: %s: comma-separated list of schema types that vanished */
                    ? sprintf(__('Some structured data is not on this page now. Missing type(s): %s.', 'seo-sentry'), $removedList)
                    : __('A type of structured data (schema markup) is not on this page now.', 'seo-sentry'),
                'why'   => __('Structured data makes rich results possible, for example star ratings, FAQs, product information and recipe cards. Without it, you lose these rich results and the clicks that they bring.', 'seo-sentry'),
                'check' => __('Examine the schema settings in your SEO plugin and your theme. A recent update possibly changed them. Then test the page with Google\'s Rich Results Test.', 'seo-sentry'),
            ],
            ChangeTypes::SCHEMA_TYPE_ADDED => [
                'what'  => $addedList !== ''
                    /* translators: %s: comma-separated list of schema types that appeared */
                    ? sprintf(__('New structured data appeared on this page: %s.', 'seo-sentry'), $addedList)
                    : __('New structured data (schema markup) appeared on this page.', 'seo-sentry'),
                'why'   => __('This change is usually safe or good, because new markup can make rich results possible. But a plugin can also add markup that you did not ask for.', 'seo-sentry'),
                'check' => __('If you recently turned on a feature or a plugin, that is probably the cause. If not, make sure that the new markup describes the page correctly.', 'seo-sentry'),
            ],
            ChangeTypes::SCHEMA_INVALID_JSON => [
                'what'  => __('A structured data block on this page is now broken (invalid JSON).', 'seo-sentry'),
                'why'   => __('Search engines fully ignore broken structured data. All rich results that come from this block will disappear.', 'seo-sentry'),
                'check' => __('Test the page with Google\'s Rich Results Test to see which block fails. Usually, a plugin or a theme prints incorrect markup after an update.', 'seo-sentry'),
            ],
            ChangeTypes::OG_CHANGED => [
                'what'  => __('The Open Graph tags on this page changed. These tags control how the page looks when people share it on Facebook, LinkedIn, Slack and most apps.', 'seo-sentry'),
                'why'   => __('A broken share preview (for example, a wrong image or a missing title) decreases the clicks on shared links.', 'seo-sentry'),
                'check' => __('Paste the page URL into a share preview tool (for example, opengraph.xyz). Make sure that the preview is still correct.', 'seo-sentry'),
            ],
            ChangeTypes::TWITTER_CHANGED => [
                'what'  => __('The Twitter card tags on this page changed. These tags control the preview when people share the page on X (Twitter).', 'seo-sentry'),
                'why'   => __('This change is small. But if you did not expect it, the tool that makes your social tags possibly changed.', 'seo-sentry'),
                'check' => __('Compare the before and after values. If other social tags also changed, examine the social settings in your SEO plugin.', 'seo-sentry'),
            ],
            ChangeTypes::H1_CHANGED => [
                'what'  => __('The main headline (H1) on this page changed.', 'seo-sentry'),
                'why'   => __('The H1 tells search engines and readers the topic of the page. A change that you did not plan can make the page less relevant for its keywords.', 'seo-sentry'),
                'check' => __('If you did not edit this page, examine the recent theme or page builder updates. These updates sometimes change the heading markup.', 'seo-sentry'),
            ],
            ChangeTypes::H1_COUNT_CHANGED => [
                'what'  => __('The number of H1 headlines on this page changed.', 'seo-sentry'),
                'why'   => __('Usually, a page must have exactly 1 H1. More H1 headlines make the topic less clear. Usually, a template change causes this.', 'seo-sentry'),
                'check' => __('Find recent theme or page builder updates that changed the page structure.', 'seo-sentry'),
            ],
            ChangeTypes::H1_REMOVED => [
                'what'  => __('This page does not have an H1 headline now.', 'seo-sentry'),
                'why'   => __('The page loses its clearest topic signal for search engines. Usually, this means that a template is broken.', 'seo-sentry'),
                'check' => __('Examine your theme and page builder. An update probably changed how they show headings.', 'seo-sentry'),
            ],
            ChangeTypes::HTTP_STATUS_ERROR => [
                'what'  => __('The page does not load now. It returns an error instead of content.', 'seo-sentry'),
                'why'   => __('Visitors see an error page. If the error continues, Google will remove the page from search results.', 'seo-sentry'),
                'check' => __('Open the page in a private browser window. A 404 error means that the URL or the permalinks changed. A 500 error means that a part of the server does not work, often after a plugin or theme update.', 'seo-sentry'),
            ],
            ChangeTypes::REDIRECT_ADDED => [
                'what'  => __('The page now redirects to a different address on this site.', 'seo-sentry'),
                'why'   => __('If you planned this redirect (for example, for a moved page), this is correct. If not, the redirect sends visitors and search engines to an address that you did not choose.', 'seo-sentry'),
                'check' => __('Make sure that the destination is correct. If it is not correct, examine your redirect plugin and your permalink settings.', 'seo-sentry'),
            ],
            ChangeTypes::REDIRECT_OFFSITE => [
                'what'  => __('The page now redirects visitors to a different website.', 'seo-sentry'),
                'why'   => __('This redirect gives the traffic and the ranking of this page to a different domain. If you did not set this redirect yourself, it is urgent. Unexpected redirects to other sites can also show that someone hacked the site.', 'seo-sentry'),
                'check' => __('Examine your redirect plugin and .htaccess. If you cannot find the cause, scan the site for malware.', 'seo-sentry'),
            ],
            ChangeTypes::WORD_COUNT_DROP_MAJOR => [
                'what'  => $ratioPct !== null
                    /* translators: %d: percentage of the page text that was lost */
                    ? sprintf(__('The text on this page decreased by about %d%%.', 'seo-sentry'), $ratioPct)
                    : __('Most of the text on this page disappeared.', 'seo-sentry'),
                'why'   => __('The page still loads, so it does not look broken. But search engines now see only a small part of the content that got its rankings. Page builder updates and migrations can cause this without a notice.', 'seo-sentry'),
                'check' => __('Open the page and compare it with the correct content. Examine your page builder after updates. Also examine your post revisions for content that someone replaced by accident.', 'seo-sentry'),
            ],
            ChangeTypes::WORD_COUNT_DROP => [
                'what'  => $ratioPct !== null
                    /* translators: %d: percentage of the page text that was lost */
                    ? sprintf(__('The text on this page decreased by about %d%%.', 'seo-sentry'), $ratioPct)
                    : __('A large part of the text on this page disappeared.', 'seo-sentry'),
                'why'   => __('If you removed text from the page yourself, this change is not a problem. If not, a plugin, a page builder or a template change possibly deleted part of the content.', 'seo-sentry'),
                'check' => __('Open the page and make sure that all sections still show.', 'seo-sentry'),
            ],
            ChangeTypes::ROBOTS_TXT_CHANGED => [
                'what'  => __('The robots.txt file of your site changed. This file tells crawlers which pages they can visit.', 'seo-sentry'),
                'why'   => __('An incorrect rule in this file can hide full sections of your site from search engines.', 'seo-sentry'),
                'check' => __('Compare the before and after content. If you did not change the file, examine your SEO and caching plugins. Some of these plugins write to robots.txt.', 'seo-sentry'),
            ],
            ChangeTypes::ROBOTS_TXT_BLOCKS_ALL => [
                'what'  => __('Your robots.txt now blocks all crawlers from all of your site.', 'seo-sentry'),
                'why'   => __('Search engines will stop visiting your site. Your rankings will decrease, and search engines will not index new content. This is a full SEO failure.', 'seo-sentry'),
                'check' => __('Remove this rule ("Disallow: /" for all user agents), unless you really want to block all crawlers. Sometimes this rule stays from a staging site.', 'seo-sentry'),
            ],
            ChangeTypes::AI_BOT_RULE_CHANGED => [
                'what'  => $botsList !== ''
                    /* translators: %s: comma-separated list of affected AI crawler names */
                    ? sprintf(__('Your robots.txt rules for AI crawlers changed. Affected: %s.', 'seo-sentry'), $botsList)
                    : __('Your robots.txt rules for AI crawlers changed.', 'seo-sentry'),
                'why'   => __('These rules control if AI assistants (for example, ChatGPT, Claude and Perplexity) can read your site and refer to it. If you block them, your site is less visible in AI answers. If you allow them, AI tools can use your content. Both can be correct, but you must make the decision.', 'seo-sentry'),
                'check' => __('Make sure that the new rules are the rules that you want. Some SEO plugins add rules for AI crawlers during an update, and they do not ask you.', 'seo-sentry'),
            ],
            ChangeTypes::SITEMAP_UNREACHABLE => [
                'what'  => __('Your XML sitemap does not load now. The sitemap is the list of pages that you give to search engines.', 'seo-sentry'),
                'why'   => __('Search engines use the sitemap to find new and updated pages. While the sitemap does not load, search engines find new content late or not at all.', 'seo-sentry'),
                'check' => __('Your SEO plugin or WordPress makes the sitemap. Make sure that the plugin is active and that its sitemap feature is on. Then save the permalink settings again.', 'seo-sentry'),
            ],
            ChangeTypes::SITEMAP_INVALID => [
                'what'  => __('Your XML sitemap loads, but it is not valid XML now.', 'seo-sentry'),
                'why'   => __('Search engines cannot read a broken sitemap. Thus the sitemap does not help them find your pages.', 'seo-sentry'),
                'check' => __('Open the sitemap URL in a browser and look for an error message in it. Usually, a plugin conflict or a PHP error breaks the output.', 'seo-sentry'),
            ],
            ChangeTypes::SITEMAP_COUNT_DROP => [
                'what'  => __('The number of pages in your XML sitemap decreased by a large amount.', 'seo-sentry'),
                'why'   => __('Search engines can still index pages that are not in the sitemap. But a sudden decrease often means that content was unpublished, set to noindex or removed from the sitemap by mistake.', 'seo-sentry'),
                'check' => __('Examine the sitemap settings in your SEO plugin for post types that are now excluded. Also make sure that nobody unpublished a group of posts.', 'seo-sentry'),
            ],
            ChangeTypes::BLOG_PUBLIC_DISABLED => [
                'what'  => __('The WordPress setting "Discourage search engines from indexing this site" is now on.', 'seo-sentry'),
                'why'   => __('Your full site now asks search engines to remove it from their results. If this setting stays on, you will lose all search traffic. This setting is for sites that are not complete.', 'seo-sentry'),
                'check' => __('Go to Settings → Reading and clear the "Discourage search engines" checkbox, unless this site must stay hidden.', 'seo-sentry'),
            ],
            ChangeTypes::AI_BOT_GONE_SILENT => [
                'what'  => __('An AI crawler visited this site regularly before. SEO Sentry has not seen a visit from this crawler for more than 30 days.', 'seo-sentry'),
                'why'   => __('Possibly robots.txt, a firewall or your host blocks this crawler now. Then your site is less visible in the answers of that AI assistant.', 'seo-sentry'),
                'check' => __('Examine your robots.txt rules and the list of blocked bots in your security or firewall plugin. Note: full-page caching can also hide crawler visits from SEO Sentry.', 'seo-sentry'),
            ],
            ChangeTypes::MONITORING_IMPAIRED => [
                'what'  => __('SEO Sentry cannot get the pages of your site, so monitoring is impaired now.', 'seo-sentry'),
                'why'   => __('SEO Sentry cannot do new checks, so changes can occur and you will not see them. This is a monitoring problem. It is possibly not an SEO problem. But until you fix it, do not trust an "all clear" result.', 'seo-sentry'),
                'check' => __('Your server possibly blocks "loopback" requests to itself. Ask your host to let the site request its own URLs. Also examine the firewall rules of your security plugin.', 'seo-sentry'),
            ],
        ];
    }
}
