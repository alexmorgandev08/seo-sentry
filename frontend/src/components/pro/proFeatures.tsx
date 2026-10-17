import {
  ApiOutlined,
  AuditOutlined,
  BellOutlined,
  BulbOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PauseCircleOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { __ } from '@common/helpers/i18nWrap'
import type { ReactNode } from 'react'

interface ProFeature {
  icon: ReactNode
  title: string
  description: string
  benefits: string[]
}

/**
 * What each pro feature does, in one place, so the locked tab, the upgrade
 * modal and any future upsell all describe it the same way.
 */
export const PRO_FEATURES = {
  alertRules: {
    icon: <BellOutlined />,
    title: __('Alert rules and page groups'),
    description: __('Select who gets alerts for each type of change, and when.'),
    benefits: [
      __('Send alerts by severity, change type, page group or site-wide check'),
      __('Send the alerts of each rule to different email addresses or webhooks'),
      __('Send alerts immediately, or in 1 daily digest'),
      __('Check your most important pages every hour and the blog every week')
    ]
  },
  autoMonitor: {
    icon: <SyncOutlined />,
    title: __('Automatic monitoring'),
    description: __('SEO Sentry starts to monitor new content when you publish it.'),
    benefits: [
      __('Monitor every post, product or custom post type'),
      __('Include or exclude by category, tag or URL pattern'),
      __('A page limit prevents too much load on your server')
    ]
  },
  expectedState: {
    icon: <AuditOutlined />,
    title: __('Expected state rules'),
    description: __('Set how a page must be. Get an alert immediately when the page is different.'),
    benefits: [
      __('"Homepage: indexable, HTTP 200, canonical URL to itself"'),
      __('Finds pages that were wrong from the start, not only changes'),
      __('Sends 1 alert, then resolves the change automatically when the page is correct')
    ]
  },
  ignoreRules: {
    icon: <PauseCircleOutlined />,
    title: __('Snooze and ignore'),
    description: __(
      'Stop alerts for changes that you expect. Then you can see the important changes.'
    ),
    benefits: [
      __('Snooze a change type on a page for 7, 30 or 90 days'),
      __('Always ignore a change that you make intentionally'),
      __('See and delete all rules in 1 list')
    ]
  },
  clientReport: {
    icon: <FileTextOutlined />,
    title: __('Client reports with your brand'),
    description: __('SEO Sentry sends a weekly or monthly SEO summary with your name on it.'),
    benefits: [
      __('Your logo, colours and footer'),
      __('New changes, resolved changes and AI crawler visits'),
      __('Every week, or every month for the last calendar month')
    ]
  },
  pageHistory: {
    icon: <HistoryOutlined />,
    title: __('Page history'),
    description: __('See all versions of a page, and compare 2 versions side by side.'),
    benefits: [
      __('A timeline of titles, canonical URLs, robots tags, schema and other SEO tags'),
      __('Compare 2 versions field by field'),
      __('See what changed before your rankings decreased')
    ]
  },
  likelyCause: {
    icon: <BulbOutlined />,
    title: __('Root cause analysis'),
    description: __('See why a change occurred, not only that it occurred.'),
    benefits: [
      __('Ranks the plugin, theme and setting events that possibly caused each change'),
      __('"Rank Math was deactivated 12 minutes before this"'),
      __('Also includes hreflang, redirect chain and sitemap URL checks')
    ]
  },
  integrations: {
    icon: <ApiOutlined />,
    title: __('Integrations'),
    description: __('Send changes to your own tools.'),
    benefits: [
      __('Webhooks to n8n, Zapier, Make or your own endpoint'),
      __('Signed requests, so your endpoint knows that they come from your site'),
      __('Slack and AI explanations will be available soon')
    ]
  }
} satisfies Record<string, ProFeature>

export type ProFeatureKey = keyof typeof PRO_FEATURES
