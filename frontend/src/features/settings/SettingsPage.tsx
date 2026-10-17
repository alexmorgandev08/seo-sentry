import {
  CalendarOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  HistoryOutlined,
  MailOutlined,
  RobotOutlined,
  SendOutlined
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  ColorPicker,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tabs
} from 'antd'
import { useEffect, useState } from 'react'
import { __, sprintf } from '@common/helpers/i18nWrap'
import useDebounce from '@common/hooks/useDebounce'
import { usePreviewReport, useSendReport, useSettings, useUpdateSettings } from '@/api/queries'
import PageHeader from '@components/PageHeader'
import ProUpsell from '@components/pro/ProUpsell'
import config from '@config/config'
import type { Settings } from '@/api/types'
import type { ProFeatureKey } from '@components/pro/proFeatures'
import type { ReactNode } from 'react'
import AlertRulesSettings from './alerts/AlertRulesSettings'
import AutoMonitorSettings from './AutoMonitorSettings'
import ExpectedStateSettings from './expectations/ExpectedStateSettings'
import { useEmailTime } from './emailTime'
import IgnoreRules from './IgnoreRules'
import LogoPicker from './LogoPicker'
import SettingRow, { CARD_STYLES } from './SettingRow'

/** Swatches for the report's accent colour; the first is pro's default. */
const BRAND_COLORS = [
  '#1d4ed8',
  '#0f766e',
  '#15803d',
  '#b45309',
  '#b91c1c',
  '#be185d',
  '#7e22ce',
  '#111827'
]

/** Saving a half-typed address would only ever come back as a server error. */
const isSavableEmail = (value: string) =>
  value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

/**
 * A pro tab is listed either way. Without the add-on its endpoints do not
 * exist, so the tab shows what the feature does instead of its settings.
 */
const proTab = (key: string, label: string, feature: ProFeatureKey, children: ReactNode) => ({
  key,
  label,
  children: config.IS_PRO ? children : <ProUpsell feature={feature} />
})

export default function SettingsPage() {
  const { message } = App.useApp()
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const sendReport = useSendReport()
  const previewReport = usePreviewReport()

  const [draft, setDraft] = useState<Settings | undefined>(settings)

  /*
   * Seeded once, not kept in sync. Every save writes the server's response
   * back into the settings cache, so re-syncing here would let a reply from
   * one keystroke overwrite the characters typed while it was in flight.
   */
  useEffect(() => {
    setDraft(previous => previous ?? settings)
  }, [settings])

  /**
   * `revert` is for controls that show their own state - a switch left showing
   * "on" after a failed save is a lie. A text field keeps what was typed
   * instead, so the correction can be made in place.
   */
  const persist = (partial: Partial<Settings>, revert = false) => {
    updateSettings.mutate(partial, {
      // A shared key, so changing several settings in a row replaces the
      // toast each time instead of stacking a pile of them up.
      onSuccess: () => message.success({ content: __('Settings saved.'), key: 'settings-saved' }),
      onError: error => {
        message.error({ content: error.message, key: 'settings-saved' })
        if (revert && settings) setDraft(settings)
      }
    })
  }

  const persistDebounced = useDebounce(persist, 600)

  const edit = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft(previous => (previous ? { ...previous, [key]: value } : previous))
  }

  /** Switches and selects: one deliberate click, so save it at once. */
  const save = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    edit(key, value)
    persist({ [key]: value }, true)
  }

  /** Typed fields: wait for the typing to stop. */
  const saveTyped = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    edit(key, value)
    persistDebounced({ [key]: value })
  }

  /** Held back until the address is complete, so typing never trips validation. */
  const saveRecipient = (value: string) => {
    edit('email_recipient', value)
    if (isSavableEmail(value)) persistDebounced({ email_recipient: value.trim() })
  }

  const sendNow = () => {
    sendReport.mutate(undefined, {
      onSuccess: () => message.success(__('Report sent.')),
      onError: error => message.error(error.message)
    })
  }

  /** Opens the rendered report in a new tab so the branding can be checked. */
  const preview = () => {
    previewReport.mutate(undefined, {
      onSuccess: data => {
        const tab = window.open('', '_blank')
        if (!tab) {
          message.warning(__('Allow pop-ups to see the preview.'))

          return
        }

        tab.document.write(data.html)
        tab.document.close()
      },
      onError: error => message.error(error.message)
    })
  }

  const isEmailDisabled = isLoading || !draft?.email_enabled
  const isReportDisabled = isLoading || !draft?.report_enabled
  // Not from the draft: the time is changed on the Alert rules tab, and the
  // draft here is seeded only once.
  const emailTime = useEmailTime()

  const tabItems = [
    {
      key: 'checking',
      label: __('Checks'),
      children: (
        <Card styles={CARD_STYLES}>
          <SettingRow
            description={__(
              'SEO Sentry also checks your pages after you update a plugin, a theme or WordPress.'
            )}
            icon={<ClockCircleOutlined />}
            title={__('How often to check for changes')}
          >
            <Select
              className="w-full"
              disabled={isLoading}
              value={draft?.frequency}
              onChange={value => save('frequency', value)}
              options={[
                { label: __('Every hour'), value: 'hourly' },
                { label: __('Twice a day'), value: 'twicedaily' },
                { label: __('Once a day'), value: 'daily' },
                { label: __('Off (only when you click Check now)'), value: 'off' }
              ]}
            />
          </SettingRow>

          <SettingRow
            description={__(
              'Enter 0 to keep all history. SEO Sentry does not delete critical changes that are not resolved.'
            )}
            icon={<HistoryOutlined />}
            title={__('How long to keep history')}
          >
            <InputNumber
              addonAfter={__('days')}
              className="w-full"
              disabled={isLoading}
              max={3650}
              min={0}
              value={draft?.retention_days}
              onChange={value => saveTyped('retention_days', value ?? 0)}
            />
          </SettingRow>
        </Card>
      )
    },
    {
      key: 'email',
      label: __('Email alerts'),
      children: (
        <Card styles={CARD_STYLES}>
          <SettingRow
            description={__('SEO Sentry sends you 1 email for each check that finds changes.')}
            icon={<MailOutlined />}
            title={__('Turn on email alerts')}
          >
            <Switch
              checked={Boolean(draft?.email_enabled)}
              disabled={isLoading}
              onChange={value => save('email_enabled', value)}
            />
          </SettingRow>

          <SettingRow
            description={__(
              'SEO Sentry also records the other changes, but it does not send an email about them.'
            )}
            icon={<FilterOutlined />}
            title={__('Email me about')}
          >
            <Select
              className="w-full"
              disabled={isEmailDisabled}
              value={draft?.email_threshold}
              onChange={value => save('email_threshold', value)}
              options={[
                { label: __('Critical changes only'), value: 'critical' },
                { label: __('Critical and Warning changes'), value: 'warning' },
                { label: __('All changes, including Info'), value: 'info' }
              ]}
            />
          </SettingRow>

          <SettingRow
            description={__('Leave this field empty to use your WordPress admin email.')}
            icon={<SendOutlined />}
            title={__('Send emails to')}
          >
            <Input
              disabled={isEmailDisabled}
              placeholder={__('you@example.com')}
              type="email"
              value={draft?.email_recipient}
              onChange={event => saveRecipient(event.target.value)}
            />
          </SettingRow>
        </Card>
      )
    },
    proTab(
      'report',
      __('Client report'),
      'clientReport',
      <Card
        styles={CARD_STYLES}
        extra={
          <Space>
            <Button
              disabled={isReportDisabled}
              loading={previewReport.isPending}
              size="small"
              onClick={preview}
            >
              {__('Preview')}
            </Button>
            <Button
              disabled={isReportDisabled}
              loading={sendReport.isPending}
              size="small"
              onClick={sendNow}
            >
              {__('Send now')}
            </Button>
          </Space>
        }
        title={__('Weekly client report')}
      >
        <SettingRow
          description={__(
            'The report shows your brand, not SEO Sentry. Select how often to send it below.'
          )}
          icon={<MailOutlined />}
          title={__('Email a client report')}
        >
          <Switch
            checked={Boolean(draft?.report_enabled)}
            disabled={isLoading}
            onChange={value => save('report_enabled', value)}
          />
        </SettingRow>

        <SettingRow
          description={
            draft?.report_frequency === 'monthly'
              ? sprintf(
                  __(
                    'The report shows the previous calendar month. SEO Sentry sends it on the first Monday of each month, at %s. Change the time on the Alert rules tab.'
                  ),
                  emailTime
                )
              : sprintf(
                  __(
                    'The report shows the last 7 days. SEO Sentry sends it every Monday, at %s. Change the time on the Alert rules tab.'
                  ),
                  emailTime
                )
          }
          icon={<CalendarOutlined />}
          title={__('How often')}
        >
          <Select
            className="w-full"
            disabled={isReportDisabled}
            options={[
              { label: __('Weekly'), value: 'weekly' },
              { label: __('Monthly'), value: 'monthly' }
            ]}
            value={draft?.report_frequency ?? 'weekly'}
            onChange={value => save('report_frequency', value)}
          />
        </SettingRow>

        <SettingRow
          description={__('Put a comma between the addresses. These addresses get the report.')}
          icon={<SendOutlined />}
          title={__('Send the report to')}
        >
          <Input
            disabled={isReportDisabled}
            placeholder={__('client@example.com, you@agency.com')}
            value={draft?.report_recipients}
            onChange={event => saveTyped('report_recipients', event.target.value)}
          />
        </SettingRow>

        <SettingRow
          description={__('The report shows this name in place of SEO Sentry.')}
          title={__('Your business name')}
        >
          <Input
            disabled={isReportDisabled}
            value={draft?.report_brand_name}
            onChange={event => saveTyped('report_brand_name', event.target.value)}
          />
        </SettingRow>

        <SettingRow
          description={__('The report uses this colour for headings and links.')}
          title={__('Accent colour')}
        >
          {/* Dragging only previews; the colour is saved once it is let go. No
              alpha: the server accepts plain hex (#rrggbb) only. */}
          <ColorPicker
            disabledAlpha
            showText
            className="w-full"
            disabled={isReportDisabled}
            format="hex"
            presets={[{ label: __('Suggested colours'), colors: BRAND_COLORS }]}
            // Inline: antd's own styles outrank a utility class here.
            style={{ justifyContent: 'flex-start' }}
            value={draft?.report_brand_color || BRAND_COLORS[0]}
            onChange={color => edit('report_brand_color', color.toHexString())}
            onChangeComplete={color => save('report_brand_color', color.toHexString())}
          />
        </SettingRow>

        <SettingRow
          description={__(
            'The report shows the logo at the top. Select an image from your Media Library or upload a new image.'
          )}
          title={__('Logo')}
        >
          <LogoPicker
            disabled={isReportDisabled}
            value={draft?.report_logo_url}
            onPick={url => save('report_logo_url', url)}
          />
        </SettingRow>

        <SettingRow
          description={__('This text replaces the default line at the bottom of the report.')}
          title={__('Footer text')}
        >
          <Input
            disabled={isReportDisabled}
            placeholder={__('Prepared by Your Agency')}
            value={draft?.report_footer}
            onChange={event => saveTyped('report_footer', event.target.value)}
          />
        </SettingRow>
      </Card>
    ),
    proTab(
      'auto-monitor',
      __('Auto-monitoring'),
      'autoMonitor',
      <AutoMonitorSettings draft={draft} isLoading={isLoading} save={save} saveTyped={saveTyped} />
    ),
    proTab('alert-rules', __('Alert rules'), 'alertRules', <AlertRulesSettings />),
    proTab('expected', __('Expected state'), 'expectedState', <ExpectedStateSettings />),
    proTab('ignored', __('Ignored changes'), 'ignoreRules', <IgnoreRules />),
    {
      key: 'ai',
      label: __('AI crawlers'),
      children: (
        <Card styles={CARD_STYLES}>
          <SettingRow
            description={__(
              'SEO Sentry records the date of the last visit from each known AI crawler. Full-page caching can hide some visits.'
            )}
            icon={<RobotOutlined />}
            title={__('Record when AI crawlers visit')}
          >
            <Switch
              checked={Boolean(draft?.bot_tracking)}
              disabled={isLoading}
              onChange={value => save('bot_tracking', value)}
            />
          </SettingRow>
        </Card>
      )
    }
  ]

  /*
   * Capped, not full width. Stretched across a wide screen, a row puts its
   * label hard left and its control hard right, and the eye loses the link
   * between the two. Left-aligned rather than centred so it stays in line
   * with every other screen's content.
   */
  return (
    <div className="max-w-4xl">
      <PageHeader title={__('Settings')} />
      <Tabs defaultActiveKey="checking" items={tabItems} />
    </div>
  )
}
