import {
  Alert,
  Card,
  Checkbox,
  Drawer,
  Empty,
  List,
  Select,
  Skeleton,
  Switch,
  Table,
  Tag
} from 'antd'
import { useState } from 'react'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { usePageHistory } from '@/api/queries'
import When from '@components/When'
import { palette } from '@config/theme'
import type { PageVersion } from '@/api/types'

/** Every field the check engine records, in the order a reader thinks about them. */
const FIELD_LABELS: Record<string, string> = {
  title: __('Title'),
  meta_description: __('Meta description'),
  meta_robots: __('Robots meta tag'),
  x_robots_tag: __('X-Robots-Tag header'),
  canonical: __('Canonical URL'),
  http_status: __('HTTP status'),
  redirect_target: __('Redirects to'),
  redirect_final: __('Redirect ends at'),
  redirect_hops: __('Number of redirects'),
  redirect_final_status: __('Final HTTP status'),
  redirect_loop: __('Redirect loop'),
  schema_types: __('Schema types'),
  h1_first: __('First H1'),
  h1_count: __('Number of H1s'),
  word_count: __('Word count'),
  og: __('Open Graph tags'),
  twitter: __('Twitter/X card tags'),
  hreflang: __('Hreflang links')
}

const fieldLabel = (key: string) => FIELD_LABELS[key] ?? key

const isEmpty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && Object.keys(value as object).length === 0)

function FieldValue({ value }: { value: unknown }) {
  if (isEmpty(value)) {
    return (
      <span className="italic" style={{ color: palette.inkFaint }}>
        {__('(empty)')}
      </span>
    )
  }

  if (Array.isArray(value)) return <span className="break-all">{value.join(', ')}</span>

  if (typeof value === 'object') {
    return (
      <pre className="scm-code m-0 max-h-48">
        {Object.entries(value as Record<string, unknown>)
          .map(([key, item]) => `${key}: ${String(item)}`)
          .join('\n')}
      </pre>
    )
  }

  return <span className="break-all">{String(value)}</span>
}

interface Props {
  /** null = closed. */
  targetId: null | number
  onClose: () => void
}

/**
 * Pro "time machine": every distinct state a page has been in, and any two of
 * them side by side. Versions, not checks - a page checked hourly for a month
 * that changed twice has three entries here.
 *
 * Mount it with key={targetId}, so its filter and ticks start fresh per page.
 */
export default function HistoryDrawer({ targetId, onClose }: Props) {
  const { data: history, isLoading } = usePageHistory(targetId)
  const [field, setField] = useState('all')
  // null until the reader ticks something: then the newest two are compared.
  const [picked, setPicked] = useState<null | number[]>(null)
  const [onlyDifferences, setOnlyDifferences] = useState(true)

  const versions = history?.versions ?? []

  const selected = picked ?? versions.slice(0, 2).map(version => version.id)

  const oldest = versions[versions.length - 1]
  const shown =
    field === 'all'
      ? versions
      : versions.filter(version => version.changed.includes(field) || version === oldest)

  const toggle = (id: number, checked: boolean) =>
    setPicked(checked ? [...selected, id].slice(-2) : selected.filter(v => v !== id))

  // Older on the left, whichever order they were ticked in.
  const [older, newer] = versions
    .filter(version => selected.includes(version.id))
    .sort((a, b) => a.first_seen.localeCompare(b.first_seen)) as [
    PageVersion | undefined,
    PageVersion | undefined
  ]

  const comparedKeys =
    older && newer
      ? Object.keys(FIELD_LABELS).filter(
          key =>
            !onlyDifferences ||
            JSON.stringify(older.fields[key] ?? null) !== JSON.stringify(newer.fields[key] ?? null)
        )
      : []

  return (
    <Drawer
      open={targetId !== null}
      // Same offset as the finding drawer, so wp-admin's toolbar stays on top.
      rootClassName="scm-drawer"
      title={history ? sprintf(__('History: %s'), history.target.label) : __('History')}
      width={780}
      onClose={onClose}
    >
      {isLoading && <Skeleton active />}

      {history && versions.length === 0 && (
        <Empty
          description={__(
            'There are no successful checks for this page. History starts after the first successful check.'
          )}
        />
      )}

      {history && versions.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="text-sm" style={{ color: palette.inkMuted }}>
            {sprintf(
              __(
                '%1$d versions from %2$d checks. SEO Sentry adds a new version only when the page changes.'
              ),
              versions.length,
              history.snapshots
            )}
            {history.failed_checks > 0 &&
              ' ' +
                sprintf(
                  __('This list does not include %d checks that could not load the page.'),
                  history.failed_checks
                )}
          </div>

          {older && newer ? (
            <Card
              extra={
                <span className="flex items-center gap-2 text-xs">
                  {__('Only differences')}
                  <Switch checked={onlyDifferences} size="small" onChange={setOnlyDifferences} />
                </span>
              }
              size="small"
              title={__('Comparison of 2 versions')}
            >
              <Table
                columns={[
                  { title: __('Field'), dataIndex: 'key', width: 150, render: fieldLabel },
                  {
                    title: <When value={older.first_seen} />,
                    render: (_, row) => <FieldValue value={older.fields[row.key]} />
                  },
                  {
                    title: <When value={newer.first_seen} />,
                    render: (_, row) => <FieldValue value={newer.fields[row.key]} />
                  }
                ]}
                dataSource={comparedKeys.map(key => ({ key }))}
                locale={{
                  emptyText: __('All recorded fields are the same in these 2 versions.')
                }}
                pagination={false}
                size="small"
              />
            </Card>
          ) : (
            versions.length > 1 && (
              <Alert
                showIcon
                message={__('Select 2 versions below to compare them.')}
                type="info"
              />
            )
          )}

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">{__('Versions')}</span>
            <Select
              className="w-64"
              options={[
                { label: __('All changes'), value: 'all' },
                ...Object.keys(FIELD_LABELS).map(key => ({
                  label: sprintf(__('Only %s changes'), fieldLabel(key)),
                  value: key
                }))
              ]}
              value={field}
              onChange={setField}
            />
          </div>

          <List
            dataSource={shown}
            renderItem={version => (
              <List.Item>
                <div className="flex w-full items-start gap-3">
                  <Checkbox
                    aria-label={__('Compare this version')}
                    checked={selected.includes(version.id)}
                    className="mt-0.5"
                    onChange={event => toggle(version.id, event.target.checked)}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <When className="text-sm font-medium" value={version.first_seen} />
                      {version.is_baseline && <Tag color="blue">{__('Baseline')}</Tag>}
                      {version.changed.length === 0 ? (
                        <Tag>{__('First version')}</Tag>
                      ) : (
                        version.changed.map(key => (
                          <Tag key={key} color="orange">
                            {fieldLabel(key)}
                          </Tag>
                        ))
                      )}
                    </div>
                    <span className="text-xs" style={{ color: palette.inkMuted }}>
                      {sprintf(__('No change in %d checks. Last seen'), version.checks)}{' '}
                      <When value={version.last_seen} />
                    </span>
                    {field !== 'all' && (
                      <div
                        className="mt-1 rounded px-3 py-2 text-sm"
                        style={{ background: palette.warningSoft }}
                      >
                        <FieldValue value={version.fields[field]} />
                      </div>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </Drawer>
  )
}
