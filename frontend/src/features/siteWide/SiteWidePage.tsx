import { Alert, Card, Table, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { __, sprintf } from '@common/helpers/i18nWrap'
import call from '@/api/client'
import { parseUtc } from '@common/helpers/datetime'
import PageHeader from '@components/PageHeader'
import When from '@components/When'
import { palette } from '@config/theme'
import SitemapAddress from './SitemapAddress'

interface BotRow {
  slug: string
  label: string
  user_agent: string
  last_seen: null | string
  hits: number
}

interface SitePanel {
  checked_at: null | string
  fields: Record<string, unknown>
  error: null | string
  status: null | number
}

/** One address the sitemap search asked for, and what came back. */
interface SitemapAttempt {
  url: string
  status: null | number
  bytes: number
  error: null | string
}

interface SiteStatus {
  robots: null | SitePanel
  sitemap: null | SitePanel
  settings: null | SitePanel
  bots: BotRow[]
  bot_tracking: boolean
  impaired: null | { since: string; reason: string }
}

// Borderless everywhere, to match the severity and status tags on the other
// screens; a bordered tag here read as a different control entirely.
const verdictTag = (verdict?: string) => {
  if (verdict === 'blocked')
    return (
      <Tag bordered={false} color="error">
        {__('Blocked')}
      </Tag>
    )
  if (verdict === 'allowed')
    return (
      <Tag bordered={false} color="success">
        {__('Allowed')}
      </Tag>
    )

  return <Tag bordered={false}>{__('Not specified')}</Tag>
}

function Placeholder({ text }: { text: string }) {
  return (
    <p className="m-0 py-6 text-center text-sm" style={{ color: palette.inkMuted }}>
      {text}
    </p>
  )
}

/** "HTTP 200 · 468 bytes" (or "HTTP 200" with no size), or the error, for one request. */
const describeResponse = (
  status: null | number | undefined,
  bytes?: number,
  error?: null | string
) => {
  if (error) return error
  if (bytes === undefined) return sprintf(__('HTTP %d'), Number(status ?? 0))

  return sprintf(__('HTTP %1$d · %2$d bytes'), Number(status ?? 0), bytes)
}

/**
 * A check whose request failed. Without this, a failed request had no fields
 * and read as "this file is empty" or "no sitemap found", which hid the cause.
 */
function FetchFailed({ error }: { error: string }) {
  return (
    <Alert
      showIcon
      description={__(
        'Your server must let the site send requests to its own address. These are called loopback requests. If this error stays, ask your hosting company to allow them.'
      )}
      message={sprintf(__('SEO Sentry could not read this file: %s'), error)}
      type="warning"
    />
  )
}

/** When the check ran, and what the server sent. Shown under each card. */
function ResponseLine({ panel, bytes }: { panel: null | SitePanel | undefined; bytes?: number }) {
  if (!panel || panel.error || panel.status === null) return null

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 text-xs"
      style={{ color: palette.inkMuted }}
    >
      <span>{describeResponse(panel.status, bytes)}</span>
      <span>·</span>
      <When value={panel.checked_at} />
    </div>
  )
}

/**
 * What the last sitemap check found: a failed request, the sitemap, an address
 * that did not answer with a sitemap, or no sitemap at all.
 */
function SitemapResult({
  panel,
  isPublic
}: {
  panel: null | SitePanel | undefined
  isPublic: boolean
}) {
  const sitemap = panel?.fields ?? {}

  if (panel?.error) return <FetchFailed error={panel.error} />

  if (sitemap.reachable) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold leading-none">
            {Number(sitemap.url_count ?? 0)}
          </span>
          <span className="text-sm" style={{ color: palette.inkMuted }}>
            {__('URLs in the sitemap')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            className="break-all text-xs"
            href={String(sitemap.url ?? '')}
            rel="noreferrer"
            target="_blank"
          >
            {String(sitemap.url ?? '')}
          </a>
          {Boolean(sitemap.manual) && <Tag bordered={false}>{__('Address from Settings')}</Tag>}
        </div>
        {sitemap.valid === false && (
          <Alert showIcon message={__('The sitemap is not valid XML.')} type="error" />
        )}
        <ResponseLine panel={panel} />
      </div>
    )
  }

  // An address is known (from Settings or robots.txt) but did not answer with
  // a sitemap: say which address, and what it sent.
  if (sitemap.url) {
    return (
      <Placeholder
        text={sprintf(
          __('SEO Sentry could not read the sitemap at %1$s. The server sent HTTP %2$d.'),
          String(sitemap.url),
          Number(panel?.status ?? 0)
        )}
      />
    )
  }

  const tried = (sitemap.tried ?? []) as SitemapAttempt[]

  return (
    <div className="flex flex-col gap-2">
      <Placeholder
        text={
          isPublic
            ? __('SEO Sentry did not find a sitemap at the usual locations.')
            : __(
                'WordPress turns off the sitemap when it tells search engines not to index the site.'
              )
        }
      />
      {/* What each address sent, so a 404, a redirect or a blocked request is
          visible without a terminal. */}
      {tried.length > 0 && (
        <div className="flex flex-col gap-1 text-xs">
          <span className="font-medium">{__('SEO Sentry looked at these addresses:')}</span>
          {tried.map(attempt => (
            <div key={attempt.url} className="flex flex-wrap gap-x-2">
              <span className="break-all">{attempt.url}</span>
              <span style={{ color: palette.inkMuted }}>
                {describeResponse(attempt.status, attempt.bytes, attempt.error)}
              </span>
            </div>
          ))}
          <When className="mt-1" value={panel?.checked_at} />
        </div>
      )}
    </div>
  )
}

export default function SiteWidePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['site-status'],
    queryFn: () => call<SiteStatus>('status/site')
  })

  const robots = data?.robots?.fields ?? {}
  const robotsText = String(robots.raw ?? '').trim()
  const robotsError = data?.robots?.error
  const sitemap = data?.sitemap?.fields ?? {}
  const isFoundAutomatically =
    Boolean(sitemap.reachable) && !sitemap.manual && !data?.sitemap?.error
  const settings = data?.settings?.fields ?? {}
  const aiBots = (robots.ai_bots ?? {}) as Record<string, string>
  const isPublic = settings.blog_public !== false

  return (
    <>
      <PageHeader title={__('Site Checks')} />

      {/* Spacing lives on this column: margin utilities on antd roots lose to
          its cssinjs reset at high hash priority. */}
      <div className="flex flex-col gap-4">
        {!isPublic && (
          <Alert
            showIcon
            description={__(
              'Go to Settings → Reading. Clear the "Discourage search engines from indexing this site" box. Until you do this, your pages will not show in search results.'
            )}
            message={__('WordPress tells search engines not to index this site')}
            type="error"
          />
        )}

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <Card loading={isLoading} title={__('robots.txt')}>
            {robotsError ? (
              <FetchFailed error={robotsError} />
            ) : robots.reachable === false ? (
              <Placeholder
                text={sprintf(
                  __('SEO Sentry cannot get this file. The server sent HTTP %d.'),
                  Number(data?.robots?.status ?? 0)
                )}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {Boolean(robots.blocks_all) && (
                  <Alert
                    showIcon
                    message={__('This file blocks all crawlers from the whole site.')}
                    type="error"
                  />
                )}
                {/* An empty file has nothing to show in a code block - the
                    placeholder would read as though that text were its
                    contents. It is also not a fault worth flagging: no rules
                    means nothing is blocked. */}
                {robotsText ? (
                  <pre className="scm-code max-h-56">{robotsText}</pre>
                ) : (
                  <Placeholder text={__('This file is empty, so it does not block crawlers.')} />
                )}
                <ResponseLine bytes={String(robots.raw ?? '').length} panel={data?.robots} />
              </div>
            )}
          </Card>

          <Card loading={isLoading} title={__('XML sitemap')}>
            <div className="flex flex-col gap-3">
              <SitemapResult isPublic={isPublic} panel={data?.sitemap} />
              {/* Open whenever the sitemap is not read automatically: then the
                address is what the user needs to change. Keyed on that, so
                it opens or closes again when a new check changes the result. */}
              {data && (
                <SitemapAddress key={String(isFoundAutomatically)} open={!isFoundAutomatically} />
              )}
            </div>
          </Card>
        </div>

        <Card
          extra={
            <span className="text-xs" style={{ color: palette.inkMuted }}>
              {__(
                'This table counts only the requests that get to WordPress. A page cache can hide some visits.'
              )}
            </span>
          }
          loading={isLoading}
          styles={{ body: { padding: 0 } }}
          title={__('AI crawlers')}
        >
          <Table<BotRow>
            dataSource={data?.bots ?? []}
            pagination={false}
            rowKey="slug"
            columns={[
              {
                title: __('Crawler'),
                dataIndex: 'label',
                render: (label: string, row) => (
                  <div className="flex flex-col">
                    <span className="font-medium">{label}</span>
                    <span className="text-xs" style={{ color: palette.inkFaint }}>
                      {row.user_agent}
                    </span>
                  </div>
                )
              },
              {
                title: __('Rule in robots.txt'),
                dataIndex: 'slug',
                width: 170,
                render: (slug: string) => verdictTag(aiBots[slug])
              },
              {
                title: __('Last visit'),
                dataIndex: 'last_seen',
                width: 220,
                render: (lastSeen: null | string, row) => {
                  if (!data?.bot_tracking) {
                    return (
                      <span className="text-xs" style={{ color: palette.inkFaint }}>
                        {__('tracking off')}
                      </span>
                    )
                  }

                  if (!lastSeen) {
                    return (
                      <span className="text-xs" style={{ color: palette.inkFaint }}>
                        {__('No visits')}
                      </span>
                    )
                  }

                  const seenAt = parseUtc(lastSeen)
                  const daysAgo = seenAt ? (Date.now() - seenAt.getTime()) / 86_400_000 : 0

                  return (
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: daysAgo > 30 ? palette.warning : palette.success }}
                      />
                      <When value={lastSeen} />
                      <span className="text-xs" style={{ color: palette.inkFaint }}>
                        {row.hits}
                      </span>
                    </span>
                  )
                }
              }
            ]}
          />
        </Card>
      </div>
    </>
  )
}
