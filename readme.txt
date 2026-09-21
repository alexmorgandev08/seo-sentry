=== SEO Sentry – SEO Change Detection & Alerts ===
Contributors: alexmorgandev
Tags: seo, monitoring, xml sitemap, schema, robots.txt
Requires at least: 5.9
Tested up to: 7.1
Requires PHP: 8.2
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Monitor SEO changes to noindex, titles, meta descriptions, canonicals, schema, robots.txt, sitemaps and redirects with email alerts.

== Description ==

SEO Sentry is an SEO change monitoring plugin for WordPress. It watches important SEO elements on your pages and across your site, records what changed, and alerts you when something may need attention.

A page can accidentally become noindex after an update. A canonical URL can change. Schema markup can disappear. A redirect can start pointing outside your site. Your robots.txt or XML sitemap can also change without anyone noticing.

SEO Sentry creates a baseline of the SEO elements it monitors and compares future checks against that baseline. When something changes, it records the finding as critical, warning, or informational so you can quickly understand what happened.

It does not replace your SEO plugin or change your SEO settings. It monitors them for unexpected changes.

= Monitor individual WordPress pages =

Add pages to Watched Pages individually or in bulk.

You can:

* Select pages from any public WordPress post type
* Add multiple URLs at once
* Pause or resume monitoring for individual pages
* Pause or resume multiple pages in bulk
* Remove monitored pages individually or in bulk

Each successful first check creates a baseline. Later checks are compared with that baseline to detect SEO changes.

= SEO changes SEO Sentry monitors =

SEO Sentry checks important on-page and technical SEO signals, including:

* **Robots meta tags**: detects noindex, nofollow, and other robots meta changes
* **SEO titles**: detects changed or removed page titles
* **Meta descriptions**: detects changed or removed meta descriptions
* **Canonical URLs**: detects changed or removed canonicals, including canonicals pointing to another domain
* **Structured data and schema**: detects schema types being added or removed and JSON-LD that no longer parses correctly
* **Open Graph tags**: detects changes to social sharing metadata
* **Twitter/X card tags**: detects changes to card metadata
* **H1 headings**: detects missing, changed, or multiple H1 headings
* **Content size**: detects significant word-count drops
* **HTTP status errors**: detects monitored pages returning errors
* **Redirects**: detects new redirects and redirects that lead outside the site

= Site-wide SEO monitoring =

SEO Sentry also runs checks that apply to the whole WordPress site.

**robots.txt monitoring**

Detects changes to robots.txt and raises a critical finding if the file begins blocking the entire site from crawling.

**AI crawler rules**

Checks robots.txt rules related to AI and search services, including directives for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, and other supported agents or tokens.

This helps you see when crawler access rules change. SEO Sentry does not modify those rules.

**XML sitemap monitoring**

Checks whether the XML sitemap is reachable and valid, and detects significant drops in the number of URLs found in the sitemap.

**WordPress search visibility**

Detects when WordPress's "Discourage search engines from indexing this site" setting is enabled or changed.

= SEO change history =

Every detected change is stored in the Change History.

Findings are graded as:

* **Critical**: changes that may have an immediate effect on crawling, indexing, or page availability
* **Warning**: changes that may require review
* **Info**: lower-risk changes recorded for reference

You can filter the history by severity, status, and monitored page to quickly find the changes you need to review.

= SEO monitoring dashboard =

The SEO Sentry dashboard gives you an overview of the site's current monitoring status.

It includes:

* Open critical, warning, and informational findings
* 14-day SEO change trend
* Changes grouped by type
* Pages and findings that need attention
* Monitoring status
* Recent monitoring activity
* AI crawler activity statistics

= Email alerts =

SEO Sentry can send one email digest after a check run when qualifying changes are found.

Instead of sending a separate email for every finding, related findings are included in a single digest.

You can choose which severity levels trigger an email:

* Critical only
* Critical and warning
* Critical, warning, and informational

= Scheduled SEO checks =

Choose how often SEO Sentry checks your monitored pages:

* Hourly
* Twice daily
* Daily
* Manual only

SEO Sentry also schedules an automatic re-check about 90 seconds after a WordPress plugin, theme, or core update. This can help catch SEO regressions caused by software updates soon after they happen.

= AI crawler activity tracking =

SEO Sentry records requests from supported AI crawler user agents when they visit your WordPress site.

This lets you see activity from crawlers such as GPTBot, ClaudeBot, PerplexityBot, CCBot, and other supported bots without connecting an analytics service.

No additional setup is required.

Crawler activity tracking reports visits. It does not guarantee that content will be indexed, cited, or used by an AI platform.

= Configurable history retention =

Choose how long SEO Sentry keeps monitoring history in your WordPress database.

This gives you control over how much historical SEO change data is retained.

= Works with your existing SEO setup =

SEO Sentry is designed to monitor the SEO output of your WordPress site rather than replace the tools that create it.

You can use it alongside your existing SEO plugin, theme, page builder, structured data setup, sitemap system, and other WordPress tools.

If one of those tools changes an SEO-relevant part of a monitored page, SEO Sentry can record the difference during the next check.

= Multisite support =

SEO Sentry supports WordPress Multisite.

Each site in the network maintains its own:

* Monitored pages
* SEO change history
* Settings
* Scheduled monitoring configuration

= Privacy and data handling =

SEO Sentry does not require an account, API key, or external monitoring service.

Page snapshots, findings, settings, monitoring history, and crawler activity are stored in your WordPress database.

Scheduled checks use WordPress functionality to request the pages and site resources being monitored.

SEO Sentry does not collect usage telemetry or send monitoring data to the plugin developer.

= Source code =

See the full source code on GitHub

https://github.com/csemazharul/seo-sentry


== Installation ==

1. Install SEO Sentry through **Plugins → Add New**, or upload it to `/wp-content/plugins/seo-sentry/`.
2. Activate the plugin.
3. Open **SEO Sentry → Watched Pages**.
4. Add the WordPress pages or URLs you want to monitor.
5. Allow the first successful check to create the SEO baseline for each page.
6. Open **Settings** to choose the check frequency, email alert threshold, notification address, and history retention period.

Future checks compare the current SEO state with the saved baseline and record any detected changes.

== Frequently Asked Questions ==

= What is SEO Sentry? =

SEO Sentry is a WordPress SEO monitoring plugin that detects changes to important technical and on-page SEO elements.

It can monitor noindex and robots directives, titles, meta descriptions, canonical URLs, schema markup, H1 headings, redirects, HTTP errors, robots.txt, XML sitemaps, and other SEO signals.

= Does SEO Sentry change my SEO settings? =

No.

SEO Sentry monitors SEO output and records changes. It does not automatically rewrite titles, change canonicals, edit robots.txt, modify schema, or change indexing settings.

= Does SEO Sentry replace my SEO plugin? =

No.

Your SEO plugin can continue managing titles, meta descriptions, canonicals, schema, sitemaps, and other SEO settings.

SEO Sentry provides a separate monitoring layer that helps detect when those outputs change.

= Why are there no findings after I add a page? =

The first successful check creates the baseline for that page.

There is nothing to compare during the first check. Findings appear when a later check detects a difference from the saved baseline.

= Can I monitor multiple pages at once? =

Yes.

You can select multiple pages from public WordPress post types or add multiple URLs at once. Monitoring can also be paused, resumed, or removed in bulk.

= What happens if a page becomes noindex? =

If the robots meta directives change and noindex appears, SEO Sentry records the change and grades it according to its severity.

If your email alert threshold includes that severity, the finding can also be included in the email digest for that check run.

= Does it monitor canonical URLs? =

Yes.

SEO Sentry can detect when a canonical tag changes, disappears, or begins pointing to another domain.

= Does it monitor schema markup? =

Yes.

SEO Sentry monitors structured data found on the page. It can detect schema types being added or removed and JSON-LD that no longer parses correctly.

= Does it monitor robots.txt? =

Yes.

SEO Sentry monitors robots.txt for changes and can raise a critical finding if the file begins blocking crawling across the whole site.

It also checks supported AI crawler directives.

= Does it monitor XML sitemaps? =

Yes.

SEO Sentry checks whether the XML sitemap is reachable and valid and can detect significant drops in the sitemap URL count.

= Does SEO Sentry track AI crawlers? =

Yes.

SEO Sentry can record requests from supported AI crawler user agents such as GPTBot, ClaudeBot, PerplexityBot, and CCBot.

It also checks robots.txt rules associated with supported AI crawlers and services.

Crawler activity indicates that a crawler requested the site. It does not mean the content will necessarily be indexed or appear in AI-generated answers.

= Will SEO Sentry alert me after a plugin, theme, or WordPress update? =

SEO Sentry schedules an automatic re-check approximately 90 seconds after a plugin, theme, or WordPress core update.

This is designed to help identify SEO changes introduced by software updates.

= How often can SEO Sentry check my pages? =

You can choose hourly, twice daily, daily, or manual-only monitoring.

Scheduled checks use WordPress scheduling functionality.

= Will I receive an email for every SEO change? =

No.

SEO Sentry groups qualifying findings from a check run into one email digest rather than sending a separate email for each finding.

You can also choose the minimum severity required before an email is sent.

= Does SEO Sentry slow down the frontend of my site? =

Scheduled page checks run separately through WordPress scheduling rather than as part of rendering normal visitor pages.

AI crawler tracking only applies when a supported crawler user agent makes a request.

As with any scheduled WordPress task, actual resource usage depends on the number of monitored pages, check frequency, hosting environment, and site configuration.

= Does SEO Sentry require an external account or API key? =

No.

The free version does not require an SEO Sentry account, API key, or external monitoring service.

= Does SEO Sentry collect usage data? =

No.

The free version does not send usage telemetry or monitoring data to the plugin developer.

Monitoring information is stored in your WordPress database.

= Can I pause monitoring without deleting a page? =

Yes.

Monitoring can be paused and resumed for individual pages or multiple pages in bulk.

= Does SEO Sentry work with WordPress Multisite? =

Yes.

Each site maintains its own monitored pages, findings, history, and settings.

= What happens when I deactivate or delete SEO Sentry? =

Deactivating the plugin keeps its stored data so monitoring can be resumed later.

Deleting the plugin removes its plugin-specific tables, options, scheduled events, and cached values.

== Changelog ==

= 1.0.0 =

* Initial release.
