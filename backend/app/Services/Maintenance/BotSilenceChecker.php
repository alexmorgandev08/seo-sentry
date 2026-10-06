<?php

namespace SeoSentry\Services\Maintenance;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Models\BotVisit;
use SeoSentry\Models\Finding;
use SeoSentry\Services\CheckEngine\AiBots;
use SeoSentry\Services\CheckEngine\Change;
use SeoSentry\Services\CheckEngine\ChangeTypes;
use SeoSentry\Services\CheckEngine\DiffContext;
use SeoSentry\Services\Db;
use SeoSentry\Services\Findings\FindingRecorder;
use SeoSentry\Services\Settings;

/**
 * Flags AI crawlers that used to visit and have since gone quiet.
 *
 * Only bots with an established history count, so a single stray visit months
 * ago never raises an alarm.
 */
class BotSilenceChecker
{
    /** Quiet for this long counts as silent. */
    public const SILENT_AFTER_DAYS = 30;

    /** And it must have been visiting for at least this long before that. */
    public const ESTABLISHED_AFTER_DAYS = 45;

    public function check()
    {
        if (!Settings::get('bot_tracking')) {
            return [];
        }

        $silent = $this->silentBots();
        $open   = Finding::where('change_type', ChangeTypes::AI_BOT_GONE_SILENT)
            ->where('status', Finding::STATUS_OPEN)
            ->first();

        if ($silent === []) {
            // Everything is visiting again; clear a standing alert.
            if ($open) {
                Db::update(
                    'findings',
                    ['status' => Finding::STATUS_AUTO_RESOLVED, 'resolved_at' => gmdate('Y-m-d H:i:s')],
                    ['id' => $open->id]
                );
            }

            return [];
        }

        $labels = array_map(static fn ($row) => $row['label'], $silent);

        // One finding lists every currently-silent bot, refreshed each run,
        // rather than a separate alert per crawler.
        (new FindingRecorder())->record(
            null,
            null,
            new Change(
                ChangeTypes::AI_BOT_GONE_SILENT,
                null,
                $labels,
                ['bots' => $labels, 'details' => $silent]
            ),
            ChangeTypes::baseSeverity(ChangeTypes::AI_BOT_GONE_SILENT),
            new DiffContext()
        );

        return $silent;
    }

    /**
     * @return array<int, array{slug: string, label: string, last_seen: string, days: int}>
     */
    private function silentBots()
    {
        $visits = Db::rows(BotVisit::get());

        $now    = time();
        $silent = [];

        foreach ($visits as $visit) {
            if ((int) $visit->hits < 1 || !$visit->last_seen_at || !$visit->first_seen_at) {
                continue;
            }

            $lastSeen  = strtotime($visit->last_seen_at . ' UTC');
            $firstSeen = strtotime($visit->first_seen_at . ' UTC');

            if (!$lastSeen || !$firstSeen) {
                continue;
            }

            $quietDays     = (int) floor(($now - $lastSeen) / DAY_IN_SECONDS);
            $knownForDays  = (int) floor(($now - $firstSeen) / DAY_IN_SECONDS);

            if ($quietDays < self::SILENT_AFTER_DAYS || $knownForDays < self::ESTABLISHED_AFTER_DAYS) {
                continue;
            }

            $silent[] = [
                'slug'      => $visit->bot_slug,
                'label'     => AiBots::label($visit->bot_slug),
                'last_seen' => $visit->last_seen_at,
                'days'      => $quietDays,
            ];
        }

        return $silent;
    }
}
