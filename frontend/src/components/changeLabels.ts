import { __ } from '@common/helpers/i18nWrap'

/** Human-readable names for change types, mirroring the PHP ChangeTypes registry. */
const LABELS: Record<string, string> = {
  title_changed: __('Title changed'),
  title_removed: __('Title removed'),
  meta_description_changed: __('Meta description changed'),
  meta_description_removed: __('Meta description removed'),
  meta_robots_changed: __('Robots tag changed'),
  noindex_added: __('Page set to noindex'),
  noindex_removed: __('Noindex removed'),
  nofollow_added: __('Page set to nofollow'),
  header_noindex_added: __('Noindex added in HTTP header'),
  header_noindex_removed: __('Noindex removed from HTTP header'),
  x_robots_tag_changed: __('X-Robots-Tag header changed'),
  expectation_failed: __('Expected state rule failed'),
  hreflang_changed: __('Hreflang links changed'),
  hreflang_removed: __('Hreflang links removed'),
  redirect_loop: __('Redirect loop'),
  redirect_dead_end: __('Redirect goes to an error'),
  redirect_final_changed: __('Redirect destination changed'),
  redirect_chain_long: __('Long redirect chain'),
  sitemap_urls_removed: __('URLs removed from sitemap'),
  canonical_changed: __('Canonical URL changed'),
  canonical_removed: __('Canonical URL removed'),
  canonical_offsite: __('Canonical URL goes to another site'),
  schema_type_removed: __('Schema type removed'),
  schema_type_added: __('Schema type added'),
  schema_invalid_json: __('Schema markup not valid'),
  og_changed: __('Open Graph tags changed'),
  twitter_changed: __('Twitter card changed'),
  h1_changed: __('H1 heading changed'),
  h1_count_changed: __('H1 count changed'),
  h1_removed: __('H1 heading removed'),
  http_status_error: __('Page returns an error'),
  redirect_added: __('Redirect added'),
  redirect_offsite: __('Redirect to another site'),
  word_count_drop_major: __('Most content removed'),
  word_count_drop: __('Content decreased'),
  robots_txt_changed: __('robots.txt changed'),
  robots_txt_blocks_all: __('robots.txt blocks all crawlers'),
  ai_bot_rule_changed: __('AI crawler rules changed'),
  sitemap_unreachable: __('Sitemap not available'),
  sitemap_invalid: __('Sitemap not valid'),
  sitemap_count_drop: __('Fewer URLs in sitemap'),
  blog_public_disabled: __('Site hidden from search engines'),
  ai_bot_gone_silent: __('AI crawler visits stopped'),
  monitoring_impaired: __('Monitoring impaired')
}

export const changeLabel = (type: string) =>
  LABELS[type] ?? type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())

/** Site events recorded alongside checks, mirroring EventRecorder's TYPE_* constants. */
const EVENT_LABELS: Record<string, string> = {
  core_updated: __('WordPress updated'),
  option_changed: __('Setting changed'),
  plugin_activated: __('Plugin activated'),
  plugin_deactivated: __('Plugin deactivated'),
  plugin_updated: __('Plugin updated'),
  post_saved: __('Content edited'),
  theme_switched: __('Theme changed'),
  theme_updated: __('Theme updated')
}

export const eventLabel = (type: string) =>
  EVENT_LABELS[type] ?? type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())

/** Outcome of the last fetch for a monitored page. */
const RESULT_LABELS: Record<string, string> = {
  changed: __('Changed'),
  error: __('Error'),
  impaired: __('Impaired'),
  ok: __('OK')
}

export const resultLabel = (result: string) =>
  RESULT_LABELS[result] ?? result.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
