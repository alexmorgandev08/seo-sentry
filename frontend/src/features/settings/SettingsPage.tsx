import {
  ClockCircleOutlined,
  FilterOutlined,
  HistoryOutlined,
  MailOutlined,
  RobotOutlined,
  SendOutlined
} from '@ant-design/icons'
import { App, Button, Card, Input, InputNumber, Select, Space, Switch, Tabs } from 'antd'
import { useEffect, useState } from 'react'
import { __ } from '@common/helpers/i18nWrap'
import useDebounce from '@common/hooks/useDebounce'
import { usePreviewReport, useSendReport, useSettings, useUpdateSettings } from '@/api/queries'
import PageHeader from '@components/PageHeader'
import config from '@config/config'
import { palette } from '@config/theme'
import type { Settings } from '@/api/types'
import type { ReactNode } from 'react'

/** Saving a half-typed address would only ever come back as a server error. */
const isSavableEmail = (value: string) =>
  value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

/** Each row brings its own vertical padding; the card must not add a second helping. */
const CARD_STYLES = { body: { paddingBlock: 4 } }

interface RowProps {
  children: ReactNode
  description?: string
  icon?: ReactNode
  title: string
}

/**
 * One setting per row: what it is on the left, the control on the right. Reads
 * as a list of decisions rather than a form to fill in, which suits a screen
 * that saves on its own.
 *
 * The divider is dropped on the last row by `last:`, so adding a row never
 * means remembering to move a flag along with it.
 */
function SettingRow({ children, description, icon, title }: RowProps) {
  return (
    <div
      className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-0 border-b border-solid py-4 last:border-b-0"
      style={{ borderColor: palette.lineSoft }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0 text-base" style={{ color: palette.inkFaint }}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium" style={{ color: palette.ink }}>
            {title}
          </div>
          {description ? (
            <p className="m-0 mt-1 text-xs leading-relaxed" style={{ color: palette.inkMuted }}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="w-full shrink-0 sm:w-64">{children}</div>
    </div>
  )
}

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

  const tabItems = [
    {
      key: 'checking',
      label: __('Checking'),
      children: (
        <Card styles={CARD_STYLES}>
          <SettingRow
            description={__('Also checks right after you update a plugin, theme, or WordPress.')}
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
                { label: __('Off (only when I click Check now)'), value: 'off' }
              ]}
            />
          </SettingRow>

          <SettingRow
            description={__(
              "Set to 0 to keep everything forever. Critical changes you haven't fixed are never deleted."
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
            description={__('Get one email after a check run finds something worth knowing.')}
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
              "Smaller changes are still recorded - you just won't get an email about them."
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
                { label: __('Critical and warnings'), value: 'warning' },
                { label: __('Everything, including info'), value: 'info' }
              ]}
            />
          </SettingRow>

          <SettingRow
            description={__('Leave empty to use your WordPress admin email.')}
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
    // The report is generated by the pro add-on; without it the endpoints
    // behind Preview and Send now do not exist.
    ...(config.IS_PRO_EXIST
      ? [
          {
            key: 'report',
            label: __('Client report'),
            children: (
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
                  description={__('Sent every Monday morning. Your branding, not ours.')}
                  icon={<MailOutlined />}
                  title={__('Email a weekly summary')}
                >
                  <Switch
                    checked={Boolean(draft?.report_enabled)}
                    disabled={isLoading}
                    onChange={value => save('report_enabled', value)}
                  />
                </SettingRow>

                <SettingRow
                  description={__('Comma-separated. These addresses receive the report.')}
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
                  description={__('Shown in place of the plugin name.')}
                  title={__('Your business name')}
                >
                  <Input
                    disabled={isReportDisabled}
                    value={draft?.report_brand_name}
                    onChange={event => saveTyped('report_brand_name', event.target.value)}
                  />
                </SettingRow>

                <SettingRow description={__('Used for headings and links.')} title={__('Accent colour')}>
                  <Input
                    disabled={isReportDisabled}
                    placeholder="#3b5bdb"
                    value={draft?.report_brand_color}
                    onChange={event => saveTyped('report_brand_color', event.target.value)}
                  />
                </SettingRow>

                <SettingRow title={__('Logo URL')}>
                  <Input
                    disabled={isReportDisabled}
                    placeholder="https://example.com/logo.png"
                    value={draft?.report_logo_url}
                    onChange={event => saveTyped('report_logo_url', event.target.value)}
                  />
                </SettingRow>

                <SettingRow
                  description={__('Replaces the default line at the bottom of the report.')}
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
            )
          }
        ]
      : []),
    {
      key: 'ai',
      label: __('AI crawlers'),
      children: (
        <Card styles={CARD_STYLES}>
          <SettingRow
            description={__(
              'Notes the date each known AI crawler last visited. Full-page caching can hide some visits.'
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
