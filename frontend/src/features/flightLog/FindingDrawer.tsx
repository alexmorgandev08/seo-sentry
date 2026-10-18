import { LockOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Timeline,
  Typography
} from 'antd'
import { useState } from 'react'
import { __, sprintf } from '@common/helpers/i18nWrap'
import {
  useAddSuppression,
  useFindingCauses,
  useReopenFinding,
  useResolveFinding
} from '@/api/queries'
import { changeLabel, eventLabel } from '@components/changeLabels'
import SeverityTag from '@components/SeverityTag'
import { useProGate } from '@components/pro/ProGate'
import { ProBadge } from '@components/pro/ProUpsell'
import When from '@components/When'
import config from '@config/config'
import { palette } from '@config/theme'
import type { Finding, LikelyCause } from '@/api/types'

const renderValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return (
      <span className="italic" style={{ color: palette.inkFaint }}>
        {__('(empty)')}
      </span>
    )
  }

  if (typeof value === 'object') {
    return <pre className="scm-code max-h-48">{JSON.stringify(value, null, 2)}</pre>
  }

  return <span className="break-all text-sm">{String(value)}</span>
}

interface Props {
  finding: Finding | null
  onClose: () => void
}

/** How long a mute lasts. 'once' is the free behaviour: only this finding closes. */
type QuietFor = 'once' | 7 | 30 | 90 | 'always'

/** Snoozing and ignoring are pro; without it they carry a badge and open the upgrade. */
const quietOption = (label: string, value: QuietFor) => ({
  value,
  label:
    config.IS_PRO || value === 'once' ? (
      label
    ) : (
      <span className="flex items-center justify-between gap-2">
        {label}
        <ProBadge />
      </span>
    )
})

const QUIET_OPTIONS = [
  quietOption(__('Only this change'), 'once'),
  quietOption(__('Snooze for 7 days'), 7),
  quietOption(__('Snooze for 30 days'), 30),
  quietOption(__('Snooze for 90 days'), 90),
  quietOption(__('Always ignore'), 'always')
]

const CAUSE_TAG: Record<LikelyCause['label'], { color: string; text: string }> = {
  likely: { color: 'orange', text: __('Likely') },
  possible: { color: 'default', text: __('Possible') }
}

/**
 * Pro: the events above, ranked by how well each explains this change. Only
 * ones that score well are shown, so an empty result shows nothing at all.
 */
function LikelyCauses({ causes }: { causes: LikelyCause[] }) {
  return (
    <Card size="small" title={causes.length === 1 ? __('Likely cause') : __('Likely causes')}>
      <div className="flex flex-col gap-3">
        {causes.map(cause => (
          <div
            key={`${cause.type}-${cause.subject}-${cause.at}`}
            className="flex items-start gap-2"
          >
            <Tag className="mt-0.5 shrink-0" color={CAUSE_TAG[cause.label].color}>
              {CAUSE_TAG[cause.label].text}
            </Tag>
            <span className="text-sm">{cause.reason}</span>
          </div>
        ))}
        <Typography.Text type="secondary" className="text-xs">
          {__(
            'SEO Sentry ranks these causes by time and by what each type of plugin or setting can change. This result is probably correct, but it is not proof.'
          )}
        </Typography.Text>
      </div>
    </Card>
  )
}

interface LinkChange {
  url: string
  before: string
  after: string
}

/**
 * Pro's link checks: each link whose follow status changed, before and after.
 * The before/after text above lists only the first few; this lists up to 50.
 */
function AffectedLinks({ finding }: { finding: Finding }) {
  const links = Array.isArray(finding.context.links) ? (finding.context.links as LinkChange[]) : []
  if (links.length === 0) return null

  const more = Number(finding.context.count ?? links.length) - links.length

  return (
    <Card size="small" title={__('Affected links')}>
      <div className="flex flex-col gap-2.5">
        {links.map(link => (
          <div key={link.url} className="flex min-w-0 flex-col gap-1">
            <a className="break-all text-sm" href={link.url} rel="noreferrer" target="_blank">
              {link.url}
            </a>
            <span className="flex flex-wrap items-center gap-1.5 text-xs">
              <Tag bordered={false}>{link.before}</Tag>
              <span style={{ color: palette.inkFaint }}>→</span>
              <Tag bordered={false} color="blue">
                {link.after}
              </Tag>
            </span>
          </div>
        ))}
        {more > 0 && (
          <Typography.Text className="text-xs" type="secondary">
            {sprintf(__('And %d more links.'), more)}
          </Typography.Text>
        )}
      </div>
    </Card>
  )
}

/** Without pro: says the events below can be ranked, and offers the upgrade. */
function LockedCauses({ onUnlock }: { onUnlock: () => void }) {
  return (
    <Card
      size="small"
      title={
        <span className="flex items-center gap-2">
          {__('Likely cause')}
          <ProBadge />
        </span>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm" style={{ color: palette.inkMuted }}>
          {__(
            'SEO Sentry Pro ranks the site events below by how well each one explains this change.'
          )}
        </span>
        <Button icon={<LockOutlined />} size="small" onClick={onUnlock}>
          {__('Get Pro')}
        </Button>
      </div>
    </Card>
  )
}

export default function FindingDrawer({ finding, onClose }: Props) {
  const { message } = App.useApp()
  const [note, setNote] = useState('')
  const [pendingAction, setPendingAction] = useState<'mute' | 'resolve' | null>(null)
  const [quietFor, setQuietFor] = useState<QuietFor>('once')
  const resolveFinding = useResolveFinding()
  const addSuppression = useAddSuppression()
  const reopenFinding = useReopenFinding()
  const { requirePro } = useProGate()
  // Pro only, and only when there is something to rank.
  const hasSuspects = Boolean(
    finding && (finding.attributed_events.length > 0 || finding.is_expected)
  )
  const { data: causes } = useFindingCauses(finding?.id ?? 0, config.IS_PRO && hasSuspects)

  if (!finding) return null

  const isClosed = finding.status !== 'open'

  // A lasting mute needs a page to attach to; site-wide findings stay one-off.
  // Without pro the choices still show, and picking one offers the upgrade.
  const canSuppress = finding.target_id !== null

  const closeFinding = () => {
    resolveFinding.mutate(
      { id: finding.id, note, action: pendingAction as 'mute' | 'resolve' },
      {
        onSuccess: () => {
          message.success(pendingAction === 'mute' ? __('Change muted.') : __('Change resolved.'))
          setNote('')
          setQuietFor('once')
          setPendingAction(null)
          onClose()
        },
        onError: error => message.error(error.message)
      }
    )
  }

  const confirm = () => {
    if (note.trim() === '') {
      message.warning(__('Write a short note that gives the reason.'))

      return
    }

    if (pendingAction !== 'mute' || !canSuppress || quietFor === 'once') {
      closeFinding()

      return
    }

    // The rule goes first: if it fails, the finding stays open rather than
    // looking silenced while the next change would still alert.
    addSuppression.mutate(
      { finding_id: finding.id, days: quietFor === 'always' ? null : quietFor, note },
      { onSuccess: closeFinding, onError: error => message.error(error.message) }
    )
  }

  return (
    <>
      <Drawer
        open
        // The drawer portals to <body> at z-index 1000, under wp-admin's own
        // toolbar; the class offsets it so the header stays clickable.
        rootClassName="scm-drawer"
        width={620}
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            <SeverityTag severity={finding.severity} />
            {changeLabel(finding.change_type)}
          </span>
        }
        extra={
          isClosed ? (
            <Button
              size="small"
              onClick={() =>
                reopenFinding.mutate(finding.id, {
                  onSuccess: () => message.success(__('Change reopened.'))
                })
              }
            >
              {__('Reopen')}
            </Button>
          ) : (
            <Space>
              <Button size="small" onClick={() => setPendingAction('mute')}>
                {__('Mute')}
              </Button>
              <Button size="small" type="primary" onClick={() => setPendingAction('resolve')}>
                {__('Resolve')}
              </Button>
            </Space>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="text-sm" style={{ color: palette.inkMuted }}>
            {finding.target_url ? (
              <a href={finding.target_url} rel="noreferrer" target="_blank">
                {finding.target_label ?? finding.target_url}
              </a>
            ) : (
              __('Site-wide')
            )}
            <span className="mx-2">·</span>
            <When value={finding.created_at} />
            {finding.is_expected && (
              <Tag bordered={false} className="ml-2" color="default">
                {__('you edited this page')}
              </Tag>
            )}
          </div>

          <Card size="small" title={__('What changed')}>
            <div className="mb-4">
              <div
                className="mb-1.5 text-xs font-semibold uppercase tracking-wide"
                style={{ color: palette.inkFaint }}
              >
                {__('Before')}
              </div>
              {renderValue(finding.before)}
            </div>
            <div>
              <div
                className="mb-1.5 text-xs font-semibold uppercase tracking-wide"
                style={{ color: palette.inkFaint }}
              >
                {__('After')}
              </div>
              {renderValue(finding.after)}
            </div>
          </Card>

          <AffectedLinks finding={finding} />

          <Card size="small" title={__('What this means')}>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <Typography.Text strong>{__('What happened')}</Typography.Text>
                <p className="mb-0 mt-1">{finding.explanation.what}</p>
              </div>
              <div>
                <Typography.Text strong>{__('Why it is important')}</Typography.Text>
                <p className="mb-0 mt-1">{finding.explanation.why}</p>
              </div>
              <div>
                <Typography.Text strong>{__('What to examine')}</Typography.Text>
                <p className="mb-0 mt-1">{finding.explanation.check}</p>
              </div>
            </div>
          </Card>

          {causes && causes.length > 0 && <LikelyCauses causes={causes} />}
          {!config.IS_PRO && hasSuspects && (
            <LockedCauses onUnlock={() => requirePro('likelyCause')} />
          )}

          <Card size="small" title={__('Site events before this change')}>
            {finding.attributed_events.length === 0 ? (
              <Empty
                description={__('There were no site events in the time before this change.')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <>
                <Typography.Text type="secondary" className="mb-3 block text-xs">
                  {__(
                    'These site events occurred a short time before this change. Possibly they caused the change, but SEO Sentry is not sure.'
                  )}
                </Typography.Text>
                <Timeline
                  items={finding.attributed_events.map(event => ({
                    children: (
                      <span className="text-sm">
                        <strong>{eventLabel(event.type)}</strong> {event.subject}
                        <When className="ml-2" value={event.at} />
                      </span>
                    )
                  }))}
                />
              </>
            )}
          </Card>

          {finding.note && (
            <Card size="small" title={__('Note')}>
              <p className="mb-0 text-sm">{finding.note}</p>
            </Card>
          )}
        </div>
      </Drawer>

      <Modal
        confirmLoading={resolveFinding.isPending || addSuppression.isPending}
        okText={pendingAction === 'mute' ? __('Mute') : __('Resolve')}
        open={pendingAction !== null}
        title={pendingAction === 'mute' ? __('Mute this change') : __('Resolve this change')}
        onCancel={() => setPendingAction(null)}
        onOk={confirm}
      >
        {pendingAction === 'mute' && canSuppress && (
          <div className="mb-4">
            <Select
              className="w-full"
              options={QUIET_OPTIONS}
              value={quietFor}
              onChange={value =>
                value === 'once'
                  ? setQuietFor(value)
                  : requirePro('ignoreRules', () => setQuietFor(value))
              }
            />
            {quietFor !== 'once' && (
              <Typography.Paragraph type="secondary" className="mb-0 mt-2 text-sm">
                {sprintf(
                  __(
                    'SEO Sentry will not record new "%s" changes on this page or send alerts for them.'
                  ),
                  changeLabel(finding.change_type)
                )}
              </Typography.Paragraph>
            )}
          </div>
        )}
        <Typography.Paragraph type="secondary" className="text-sm">
          {__(
            'Write a short note about the reason. The note helps you when you examine this change later.'
          )}
        </Typography.Paragraph>
        <Input.TextArea
          autoFocus
          placeholder={__(
            'For example: Intentional. We wrote new text for this page for the new campaign.'
          )}
          rows={3}
          value={note}
          onChange={event => setNote(event.target.value)}
        />
      </Modal>
    </>
  )
}
