<?php

namespace SEOChangeMonitor\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use SEOChangeMonitor\Deps\BitApps\WPKit\Http\Request\Request;
use SEOChangeMonitor\Deps\BitApps\WPKit\Http\Response;
use SEOChangeMonitor\Models\Target;
use SEOChangeMonitor\Services\Db;

class TargetController
{
    public function index()
    {
        $targets = Db::rows(Target::where('type', Target::TYPE_PAGE)->orderBy('id')->desc()->get());

        return Response::success($targets);
    }

    public function store(Request $request)
    {
        $url    = $this->normalizeUrl((string) $request->get('url'));
        $postId = (int) $request->get('post_id') ?: null;

        if ($postId && !$url) {
            $permalink = get_permalink($postId);
            $url       = $permalink ? $this->normalizeUrl($permalink) : null;
        }

        if (!$url) {
            return Response::error(__('Please provide a valid URL on this site.', 'seo-sentry'));
        }

        $label  = sanitize_text_field((string) $request->get('label'));
        $target = $this->insertPageTarget($url, $postId, $label !== '' ? $label : $url);

        if (!$target) {
            return Response::error(__('This page is already being monitored.', 'seo-sentry'));
        }

        return Response::success($target);
    }

    /**
     * Adds several pages at once - either picked from search (post_ids) or
     * typed as plain URLs (urls), one request field or the other depending on
     * which tab the modal is on. Duplicates and invalid entries are counted
     * and skipped rather than failing the whole batch over one of several.
     */
    public function bulkCreate(Request $request)
    {
        $items = $this->resolveBulkCreateItems($request);

        if ($items === []) {
            return Response::error(__('Pick at least one page, or enter at least one URL.', 'seo-sentry'));
        }

        $created   = [];
        $duplicate = 0;
        $invalid   = 0;

        foreach ($items as [$url, $postId, $label]) {
            if (!$url) {
                ++$invalid; // Off-site, malformed, or a post that no longer resolves to a URL.

                continue;
            }

            $target = $this->insertPageTarget($url, $postId, $label);

            if ($target) {
                $created[] = $target;
            } else {
                ++$duplicate;
            }
        }

        if ($created === []) {
            // Every pick was filtered out, for one reason or another, so
            // there is no single honest reason to give back.
            return Response::error(__('None of the selected pages could be added.', 'seo-sentry'));
        }

        return Response::success(['created' => $created, 'skipped' => $duplicate, 'invalid' => $invalid]);
    }

    /**
     * Normalizes post_ids and free-typed urls into one list of
     * [url-or-null, post_id-or-null, label] tuples, ready for
     * insertPageTarget() - a null url means the entry could not be used.
     *
     * @return array<int, array{0: ?string, 1: ?int, 2: string}>
     */
    private function resolveBulkCreateItems(Request $request)
    {
        $items = [];

        $postIds = array_values(array_unique(array_filter(array_map('intval', (array) $request->get('post_ids')))));
        foreach ($postIds as $postId) {
            $permalink = get_permalink($postId);
            $url       = $permalink ? $this->normalizeUrl($permalink) : null;
            $post      = get_post($postId);
            $label     = $post && $post->post_title !== '' ? $post->post_title : (string) $url;

            $items[] = [$url, $postId, $label];
        }

        $rawUrls = array_filter(array_map('trim', (array) $request->get('urls')), static fn ($url) => $url !== '');
        foreach (array_unique($rawUrls) as $rawUrl) {
            $url = $this->normalizeUrl((string) $rawUrl);

            $items[] = [$url, null, (string) $url];
        }

        return $items;
    }

    public function update(Request $request)
    {
        $target = $this->findPageTarget((int) $request->get('id'));
        if (!$target) {
            return Response::error(__('Monitored page not found.', 'seo-sentry'));
        }

        $updates = [];
        if ($request->has('label')) {
            $updates['label'] = sanitize_text_field((string) $request->get('label'));
        }

        if ($request->has('is_active')) {
            $updates['is_active'] = $request->get('is_active') ? 1 : 0;
        }

        if ($updates !== []) {
            Db::update('targets', $updates, ['id' => $target->id]);
        }

        return Response::success(Target::findOne(['id' => $target->id]));
    }

    public function destroy(Request $request)
    {
        $target = $this->findPageTarget((int) $request->get('id'));
        if (!$target) {
            return Response::error(__('Monitored page not found.', 'seo-sentry'));
        }

        Target::destroy([$target->id]);

        return Response::success(['deleted' => $target->id]);
    }

    public function bulkUpdate(Request $request)
    {
        $ids = $this->findPageTargetIds((array) $request->get('ids'));
        if ($ids === []) {
            return Response::error(__('No monitored pages were selected.', 'seo-sentry'));
        }

        if (!$request->has('is_active')) {
            return Response::error(__('Nothing to update.', 'seo-sentry'));
        }

        Target::whereIn('id', $ids)->update(['is_active' => $request->get('is_active') ? 1 : 0]);

        return Response::success(['updated' => $ids]);
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $this->findPageTargetIds((array) $request->get('ids'));
        if ($ids === []) {
            return Response::error(__('No monitored pages were selected.', 'seo-sentry'));
        }

        Target::destroy($ids);

        return Response::success(['deleted' => $ids]);
    }

    public function searchPosts(Request $request)
    {
        $term = sanitize_text_field((string) $request->get('term'));

        $posts = get_posts(
            [
                'post_type'   => $this->searchablePostTypes(),
                'post_status' => 'publish',
                'numberposts' => 20,
                's'           => $term,
            ]
        );

        $results = [];
        foreach ($posts as $post) {
            $postType = get_post_type_object($post->post_type);

            $results[] = [
                'post_id'         => $post->ID,
                'title'           => $post->post_title !== '' ? $post->post_title : __('(no title)', 'seo-sentry'),
                'url'             => get_permalink($post),
                'type'            => $post->post_type,
                'post_type_label' => $postType ? $postType->labels->singular_name : $post->post_type,
            ];
        }

        return Response::success($results);
    }

    /**
     * Every public post type, including custom ones a theme or plugin
     * registers, so the picker is not stuck at pages and posts. Media
     * attachments are excluded: an attachment "page" is a file, not the kind
     * of content page this plugin checks for a title, schema or canonical.
     *
     * @return string[]
     */
    private function searchablePostTypes()
    {
        $types = get_post_types(['public' => true, 'show_ui' => true], 'names');
        unset($types['attachment']);

        return array_values($types);
    }

    private function findPageTarget($id)
    {
        if (!$id) {
            return false;
        }

        $target = Target::findOne(['id' => $id]);

        // System targets (robots/sitemap/site settings) are not user-editable.
        return $target && $target->type === Target::TYPE_PAGE ? $target : false;
    }

    /**
     * Inserts one page target, unless the URL is already monitored - shared by
     * store() (one page from the modal) and bulkCreate() (several at once,
     * from either modal tab). Returns null both when the page was already
     * monitored and, same as Target::insert() itself, if the insert failed
     * outright.
     */
    private function insertPageTarget($url, $postId, $label)
    {
        if (Target::findOne(['url' => $url, 'type' => Target::TYPE_PAGE])) {
            return null;
        }

        $target = Target::insert(
            [
                'type'      => Target::TYPE_PAGE,
                'post_id'   => $postId,
                'url'       => $url,
                'label'     => $label,
                'is_active' => 1,
            ]
        );

        return $target ?: null;
    }

    /**
     * Narrows a client-supplied id list down to ones that actually exist and
     * are user-editable pages, the same rule findPageTarget() applies to a
     * single id - a bulk action must not be a back door to touch the system
     * targets (robots/sitemap/site settings).
     *
     * @return int[]
     */
    private function findPageTargetIds(array $ids)
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if ($ids === []) {
            return [];
        }

        $found = Db::rows(Target::whereIn('id', $ids)->where('type', Target::TYPE_PAGE)->get());

        return array_map(static fn ($target) => (int) $target->id, $found);
    }

    /**
     * Only URLs on this site are monitorable; anything else returns null.
     */
    private function normalizeUrl($url)
    {
        $url = esc_url_raw(trim($url));
        if ($url === '') {
            return null;
        }

        $homeHost = wp_parse_url(home_url(), PHP_URL_HOST);
        $urlHost  = wp_parse_url($url, PHP_URL_HOST);

        if ($urlHost === null || strcasecmp((string) $urlHost, (string) $homeHost) !== 0) {
            return null;
        }

        return $url;
    }
}
