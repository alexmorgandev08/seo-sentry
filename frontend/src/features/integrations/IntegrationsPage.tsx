import { App, Button, Card, Form, Input, Select, Space, Switch, Tag } from 'antd'
import { useEffect } from 'react'
import { __ } from '@common/helpers/i18nWrap'
import { useSettings, useTestWebhook, useUpdateSettings } from '@/api/queries'
import PageHeader from '@components/PageHeader'
import ProUpsell from '@components/pro/ProUpsell'
import config from '@config/config'
import { palette } from '@config/theme'
import type { Settings } from '@/api/types'

const THRESHOLD_OPTIONS = [
  { label: __('Critical changes only'), value: 'critical' },
  { label: __('Critical and warnings'), value: 'warning' },
  { label: __('Everything, including info'), value: 'info' }
]

/** A service that is announced but not released: nothing to switch on yet. */
function ComingSoonCard({
  title,
  description,
  className
}: {
  title: string
  description: string
  className?: string
}) {
  return (
    <Card className={className} extra={<Tag color="blue">{__('Coming soon')}</Tag>} title={title}>
      <p className="mb-0 text-sm" style={{ color: palette.inkMuted }}>
        {description}
      </p>
    </Card>
  )
}

/**
 * Everything that connects to a service outside this site. Each card needs a
 * URL or key the user brings from elsewhere, which is what separates these
 * from the built-in email alerts on the Settings page.
 *
 * A pro screen: without the add-on the webhook endpoints do not exist, so the
 * page explains what it adds instead.
 */
export default function IntegrationsPage() {
  if (!config.IS_PRO) {
    return (
      <div className="max-w-4xl">
        <PageHeader title={__('Integrations')} />
        <ProUpsell feature="integrations" />
      </div>
    )
  }

  return <IntegrationsForm />
}

function IntegrationsForm() {
  const [form] = Form.useForm<Settings>()
  const { message } = App.useApp()
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const testWebhook = useTestWebhook()

  const webhookEnabled = Form.useWatch('webhook_enabled', form)

  useEffect(() => {
    if (settings) form.setFieldsValue(settings)
  }, [settings, form])

  const submit = (values: Settings) => {
    updateSettings.mutate(values, {
      onSuccess: () => message.success(__('Integrations saved.')),
      onError: error => message.error(error.message)
    })
  }

  /** Tests the first endpoint currently in the field, saved or not. */
  const sendWebhookTest = () => {
    const urls: unknown = form.getFieldValue('webhook_urls')
    const first = (
      Array.isArray(urls) ? String(urls[0] ?? '') : String(urls ?? '').split('\n')[0]
    ).trim()

    if (first === '') {
      message.warning(__('Add an endpoint URL first.'))

      return
    }

    testWebhook.mutate(first, {
      onSuccess: () => message.success(__('Your endpoint accepted the test delivery.')),
      onError: error => message.error(error.message)
    })
  }

  return (
    <div>
      <PageHeader
        actions={
          <>
            <span className="hidden text-xs sm:inline" style={{ color: palette.inkMuted }}>
              {__('Each service is off until you switch it on.')}
            </span>
            {/* Outside the <Form>, so it submits through the form instance. */}
            <Button
              disabled={isLoading}
              loading={updateSettings.isPending}
              type="primary"
              onClick={() => form.submit()}
            >
              {__('Save integrations')}
            </Button>
          </>
        }
        title={__('Integrations')}
      />

      {/*
        One card per service, side by side once there is room: three across on
        wide screens, Webhooks and Slack paired with AI below on medium ones.
        Slack and AI are announced but not released yet, so they show as coming soon.
        Each card's switch sits in its header and its settings only show while
        it is on; a card that is off keeps its saved values, because saving
        sends only the fields on screen and the server merges the rest.
        Cards in a row share one height (the grid's default stretch), so
        descriptions of different lengths still line up edge to edge.
        Spacing lives on the grid, not the cards: antd's cssinjs runs at high
        hash priority, so a margin utility on .ant-card loses to its reset.
      */}
      <Form
        className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3"
        disabled={isLoading}
        form={form}
        layout="vertical"
        onFinish={submit}
      >
        <Card
          extra={
            <Space size="middle">
              {webhookEnabled && (
                <Button loading={testWebhook.isPending} size="small" onClick={sendWebhookTest}>
                  {__('Send test')}
                </Button>
              )}
              <Form.Item noStyle name="webhook_enabled" valuePropName="checked">
                <Switch aria-label={__('Send results to a webhook')} />
              </Form.Item>
            </Space>
          }
          title={__('Webhooks')}
        >
          <p
            className={webhookEnabled ? 'mb-5 text-sm' : 'mb-0 text-sm'}
            style={{ color: palette.inkMuted }}
          >
            {__(
              'Posts each check result as JSON to your own endpoints, so you can pipe findings anywhere.'
            )}
          </p>

          {webhookEnabled && (
            <>
              <Form.Item
                className="mb-5"
                extra={__('One URL per line, up to 10.')}
                label={__('Endpoint URLs')}
                name="webhook_urls"
                getValueProps={value => ({
                  value: Array.isArray(value) ? value.join('\n') : value
                })}
                normalize={value =>
                  String(value ?? '')
                    .split('\n')
                    .map(line => line.trim())
                    .filter(Boolean)
                }
              >
                <Input.TextArea placeholder="https://example.com/hooks/seo" rows={3} />
              </Form.Item>

              <Form.Item className="mb-5" label={__('Only send')} name="webhook_threshold">
                <Select options={THRESHOLD_OPTIONS} />
              </Form.Item>

              <Form.Item
                className="mb-0"
                extra={__(
                  'Optional. When set, each request carries an X-SEO-Monitor-Signature header so your endpoint can verify it came from this site.'
                )}
                label={__('Signing secret')}
                name="webhook_secret"
              >
                <Input.Password
                  autoComplete="off"
                  placeholder={__('Leave empty for no signature')}
                />
              </Form.Item>
            </>
          )}
        </Card>

        <ComingSoonCard
          description={__(
            'Post critical and warning findings to a Slack channel, with what changed and why it matters.'
          )}
          title={__('Slack')}
        />

        <ComingSoonCard
          // Spans the row on medium screens rather than sitting alone at half width.
          className="lg:col-span-2 2xl:col-span-1"
          description={__(
            'Explain any finding in plain English with your own OpenAI or Anthropic key: what changed, the SEO risk, the likely cause and what to do next.'
          )}
          title={__('AI explanations')}
        />
      </Form>
    </div>
  )
}
