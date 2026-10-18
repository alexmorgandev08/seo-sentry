<?php

namespace SeoSentry\Services\CheckEngine;

if (!defined('ABSPATH')) {
    exit;
}

use SeoSentry\Config;
use SeoSentry\Models\CheckRun;
use SeoSentry\Models\Finding;
use SeoSentry\Models\Snapshot;
use SeoSentry\Models\Target;
use SeoSentry\Services\Alerts\AlertMailer;
use SeoSentry\Services\Baseline\BaselineManager;
use SeoSentry\Services\Db;
use SeoSentry\Services\Events\Attribution;
use SeoSentry\Services\Findings\FindingRecorder;
use SeoSentry\Services\ImpairedState;

/**
 * Owns a check run: queues the targets, processes them in chunks small enough
 * to survive any host's timeout, then finalizes.
 */
class CheckRunner
{
    /** Targets per tick, plus a wall-clock guard for slow sites. */
    public const CHUNK_SIZE = 10;

    public const CHUNK_SECONDS = 20;

    /** A queue older than this is considered abandoned and may be replaced. */
    public const STALE_QUEUE_SECONDS = 900;

    /** @var TargetChecker */
    private $checker;

    /** @var SnapshotDiffer */
    private $differ;

    /** @var SiteChecker */
    private $siteChecker;

    /** @var SeverityClassifier */
    private $classifier;

    /** @var FindingRecorder */
    private $recorder;

    /** @var Attribution */
    private $attribution;

    public function __construct()
    {
        $this->checker     = new TargetChecker();
        $this->differ      = new SnapshotDiffer();
        $this->siteChecker = new SiteChecker();
        $this->classifier  = new SeverityClassifier();
        $this->recorder    = new FindingRecorder();
        $this->attribution = new Attribution();
    }

    /**
     * Starts a run and processes the first chunk inline, scheduling the rest.
     *
     * @param string $trigger scheduled|post_change|manual|baseline|cli
     *
     * @return CheckRun|false false when another run is already in flight
     */
    public function startRun($trigger = 'manual')
    {
        if ($this->hasLiveQueue()) {
            return false;
        }

        $targets = $this->queueableTargets($trigger);

        // A scheduled run can find nothing due when pages have their own
        // cadences; no point recording an empty run for it.
        if ($targets === [] && $trigger === 'scheduled') {
            return false;
        }

        $run = CheckRun::insert(
            [
                'trigger_type'  => $trigger,
                'status'        => CheckRun::STATUS_RUNNING,
                'targets_total' => \count($targets),
                'targets_done'  => 0,
                'started_at'    => gmdate('Y-m-d H:i:s'),
            ]
        );

        if (!$run) {
            return false;
        }

        Config::updateOption(
            'run_queue',
            [
                'run_id'      => (int) $run->id,
                'pending_ids' => array_map(static fn ($target) => (int) $target->id, $targets),
                'errors'      => 0,
                'started_at'  => time(),
            ]
        );

        $this->tick();

        return CheckRun::findOne(['id' => $run->id]);
    }

    /**
     * Processes one chunk of the queued run, then either reschedules itself or
     * finalizes. Safe to call from cron, admin_init catch-up, or the CLI.
     */
    public function tick()
    {
        $queue = Config::getOption('run_queue');
        if (!\is_array($queue) || empty($queue['run_id'])) {
            return false;
        }

        $runId   = (int) $queue['run_id'];
        $pending = (array) ($queue['pending_ids'] ?? []);
        $errors  = (int) ($queue['errors'] ?? 0);

        $run = CheckRun::findOne(['id' => $runId]);
        if (!$run) {
            Config::deleteOption('run_queue');

            return false;
        }

        $startedAt = time();
        $processed = 0;

        while ($pending !== [] && $processed < self::CHUNK_SIZE) {
            if ($processed > 0 && (time() - $startedAt) >= self::CHUNK_SECONDS) {
                break; // leave the rest for the next tick rather than risk a timeout
            }

            $targetId = (int) array_shift($pending);
            $target   = Target::findOne(['id' => $targetId]);

            if ($target) {
                $this->checkTarget($target, $runId, $errors);
            }

            ++$processed;
        }

        $done = (int) $run->targets_total - \count($pending);
        Db::update('check_runs', ['targets_done' => $done], ['id' => $runId]);

        if ($pending === []) {
            Config::deleteOption('run_queue');

            return $this->finalizeRun($runId, $done, (int) $run->targets_total, $errors);
        }

        $queue['pending_ids'] = array_values($pending);
        $queue['errors']      = $errors;
        Config::updateOption('run_queue', $queue);

        $this->scheduleNextTick();

        return true;
    }

    /**
     * Runs a whole check to completion in this process. Used by the CLI and the
     * "Check now" button, where the user is waiting for the result.
     */
    public function runSync($trigger = 'manual')
    {
        $run = $this->startRun($trigger);
        if (!$run) {
            return false;
        }

        $guard = 0;
        while (Config::getOption('run_queue') && $guard < 500) {
            $this->tick();
            ++$guard;
        }

        return CheckRun::findOne(['id' => $run->id]);
    }

    /**
     * Fetch, snapshot, diff, classify, and record for one target.
     */
    public function checkTarget($target, $runId, &$transportErrors)
    {
        $comparison = $this->comparisonSnapshot($target);
        $snapshot   = $this->checker->snapshot($target, $runId);

        if (!$snapshot) {
            return;
        }

        if ($snapshot->fetch_error) {
            ++$transportErrors;

            return; // never diff or resolve against a failed fetch
        }

        $currentFields = json_decode((string) $snapshot->fields, true) ?: [];

        if ($comparison && $comparison->content_hash !== $snapshot->content_hash) {
            $previousFields = json_decode((string) $comparison->fields, true) ?: [];

            $changes = \in_array($target->type, Target::SYSTEM_TYPES, true)
                ? $this->siteChecker->diff($target->type, $previousFields, $currentFields)
                : $this->differ->diff($previousFields, $currentFields);

            $context = $this->attribution->context($target, $runId);

            foreach ($changes as $change) {
                $severity = $this->classifier->classify($change, $context);

                // Lets an add-on regrade a change, or drop it by returning an
                // empty value - the snapshot is already saved, so a dropped
                // change still moves the comparison point forward.
                $severity = apply_filters(Config::withPrefix('finding_severity'), $severity, $change, $target, $context);
                if (empty($severity)) {
                    continue;
                }

                $this->recorder->record($runId, $target->id, $change, $severity, $context);
            }

            if ($changes !== []) {
                Db::update('targets', ['last_result' => 'changed'], ['id' => $target->id]);
            }
        }

        $this->recorder->autoResolve($target->id, $currentFields);

        // The page's current state, whether or not anything changed - so an
        // add-on can judge the page as it is, including on its first check,
        // when there is nothing yet to compare against.
        do_action(Config::withPrefix('target_checked'), $target, $runId, $currentFields);
    }

    /**
     * While a baseline is armed we compare against it, so a burst of updates is
     * measured against the known-good state rather than the previous run.
     */
    private function comparisonSnapshot($target)
    {
        if (BaselineManager::isArmed()) {
            $baseline = Snapshot::where('target_id', $target->id)
                ->where('is_baseline', 1)
                ->orderBy('id')->desc()
                ->first();

            if ($baseline) {
                return $baseline;
            }
        }

        return Snapshot::where('target_id', $target->id)
            ->where('is_baseline', 0)
            ->orderBy('id')->desc()
            ->first();
    }

    private function finalizeRun($runId, $done, $total, $transportErrors)
    {
        $counts   = ['critical' => 0, 'warning' => 0, 'info' => 0];
        $findings = Db::rows(Finding::where('check_run_id', $runId)->get());
        foreach ($findings as $finding) {
            if (isset($counts[$finding->severity])) {
                ++$counts[$finding->severity];
            }
        }

        $isImpaired = $total > 0 && $transportErrors >= $total;

        if ($isImpaired) {
            // The real error says what to ask the host about: a timeout, a
            // certificate problem, an empty response from a firewall.
            $failed = Snapshot::where('check_run_id', $runId)->whereNotNull('fetch_error')->first();
            $reason = __('The site could not get its own pages (loopback requests fail).', 'seo-sentry');

            if ($failed) {
                /* translators: %s: the error message, for example "Operation timed out" */
                $reason .= ' ' . sprintf(__('Last error: %s', 'seo-sentry'), $failed->fetch_error);
            }

            ImpairedState::mark($reason);
        } else {
            ImpairedState::clear();
        }

        Db::update(
            'check_runs',
            [
                'status'         => $isImpaired ? CheckRun::STATUS_IMPAIRED : CheckRun::STATUS_COMPLETE,
                'targets_done'   => $done,
                'critical_count' => $counts['critical'],
                'warning_count'  => $counts['warning'],
                'info_count'     => $counts['info'],
                'finished_at'    => gmdate('Y-m-d H:i:s'),
            ],
            ['id' => $runId]
        );

        BaselineManager::disarmAfterComparison($runId);

        (new AlertMailer())->sendRunDigest($runId);

        // Anything that notifies an outside service listens here.
        do_action(Config::withPrefix('run_finished'), $runId);

        return CheckRun::findOne(['id' => $runId]);
    }

    /** Scheduled runs check only what is due; manual and post-update runs check everything. */
    private function queueableTargets($trigger = 'manual')
    {
        $targets = Db::rows(Target::where('is_active', 1)->orderBy('id')->asc()->get());

        if ($trigger === 'scheduled') {
            $targets = array_values(array_filter($targets, [$this, 'isDue']));
        }

        // System targets first: a site-wide problem explains page-level ones.
        usort(
            $targets,
            static fn ($a, $b) => ($a->type === Target::TYPE_PAGE ? 1 : 0) <=> ($b->type === Target::TYPE_PAGE ? 1 : 0)
        );

        return $targets;
    }

    /**
     * Has this target's own interval passed since it was last checked? Free
     * gives no target an interval, so every scheduled run checks everything,
     * as before. An add-on sets one per target through target_interval.
     *
     * 15% slack, so a page meant to be checked hourly - last checked at 10:02
     * because the run took two minutes to reach it - is still due at 11:00
     * rather than slipping to every other hour.
     */
    private function isDue($target)
    {
        $interval = apply_filters(Config::withPrefix('target_interval'), null, $target);

        if ($interval === null || !$target->last_checked_at) {
            return true;
        }

        $elapsed = time() - (int) strtotime($target->last_checked_at . ' UTC');

        return $elapsed >= (int) $interval * 0.85;
    }

    private function hasLiveQueue()
    {
        $queue = Config::getOption('run_queue');

        if (!\is_array($queue) || empty($queue['started_at'])) {
            return false;
        }

        if ((time() - (int) $queue['started_at']) > self::STALE_QUEUE_SECONDS) {
            Config::deleteOption('run_queue'); // abandoned run, reclaim it

            return false;
        }

        return true;
    }

    private function scheduleNextTick()
    {
        $hook = Config::withPrefix('run_tick');

        if (!wp_next_scheduled($hook)) {
            wp_schedule_single_event(time() + 10, $hook);
        }

        // Low-traffic sites may not fire cron on their own.
        if (!defined('DISABLE_WP_CRON') || !DISABLE_WP_CRON) {
            spawn_cron();
        }
    }
}
