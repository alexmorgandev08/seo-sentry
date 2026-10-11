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
    description: __('Decide who hears about which changes, and when.'),
    benefits: [
      __('Alert by severity, change type, page group or site-wide check'),
      __('Send each rule to its own email addresses or webhooks'),
      __('Right away, or as one daily digest'),
      __('Check money pages hourly and the blog weekly')
    ]
  },
  autoMonitor: {
    icon: <SyncOutlined />,
    title: __('Smart auto-monitoring'),
    description: __('New content is monitored the moment it is published.'),
    benefits: [
      __('Monitor every post, product or custom post type'),
      __('Include or exclude by category, tag or URL pattern'),
      __('A page limit keeps your server comfortable')
    ]
  },
  expectedState: {
    icon: <AuditOutlined />,
    title: __('Expected state rules'),
    description: __('Say how a page must look, and know the moment it does not.'),
    benefits: [
      __('"Homepage stays indexable, HTTP 200, self-canonical"'),
      __('Catches pages that were wrong from day one, not only changes'),
      __('Alerts once, then resolves itself when the page is fixed')
    ]
  },
  ignoreRules: {
    icon: <PauseCircleOutlined />,
    title: __('Snooze and ignore'),
    description: __('Silence the changes you expect, so the real ones stand out.'),
    benefits: [
      __('Snooze a change type on a page for 7, 30 or 90 days'),
      __('Always ignore a change you make on purpose'),
      __('Review and undo every rule in one list')
    ]
  },
  clientReport: {
    icon: <FileTextOutlined />,
    title: __('Branded client reports'),
    description: __('A weekly or monthly SEO summary, sent under your name.'),
    benefits: [
      __('Your logo, colours and footer'),
      __('Changes, resolved issues and AI crawler activity'),
      __('Weekly, or monthly for the previous calendar month')
    ]
  },
  pageHistory: {
    icon: <HistoryOutlined />,
    title: __('SEO time machine'),
    description: __('Every version of a page, and any two side by side.'),
    benefits: [
      __('A timeline of titles, canonicals, robots, schema and more'),
      __('Compare any two versions field by field'),
      __('Find what changed before rankings dropped')
    ]
  },
  likelyCause: {
    icon: <BulbOutlined />,
    title: __('Root cause analysis'),
    description: __('Know why a change happened, not just that it did.'),
    benefits: [
      __('Ranks the plugin, theme and setting changes behind each finding'),
      __('"Rank Math was deactivated 12 minutes before this"'),
      __('Hreflang, redirect chain and sitemap URL checks included')
    ]
  },
  integrations: {
    icon: <ApiOutlined />,
    title: __('Integrations'),
    description: __('Send findings to your own tools.'),
    benefits: [
      __('Webhooks to n8n, Zapier, Make or your own endpoint'),
      __('Signed requests so your endpoint can trust them'),
      __('Slack and AI explanations coming soon')
    ]
  }
} satisfies Record<string, ProFeature>

export type ProFeatureKey = keyof typeof PRO_FEATURES
