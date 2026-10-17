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
  { label: __('Critical and Warning changes'), value: 'warning' },
  { label: __('All changes, including Info'), value: 'info' }
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
    if (!settings) return

    // One endpoint. The server keeps a list, so the field edits its first
    // entry; an empty one is dropped on save.
    form.setFieldsValue({ ...settings, webhook_urls: [settings.webhook_urls?.[0] ?? ''] })
  }, [settings, form])

  const submit = (values: Settings) => {
    updateSettings.mutate(values, {
      onSuccess: () => message.success(__('Integrations saved.')),
      onError: error => message.error(error.message)
    })
  }

  /** Tests the endpoint on screen, saved or not. */
  const sendWebhookTest = () => {
    const url = String(form.getFieldValue(['webhook_urls', 0]) ?? '').trim()

    if (url === '') {
      message.warning(__('Enter an endpoint URL first.'))

      return
    }

    testWebhook.mutate(url, {
      onSuccess: () => message.success(__('Your endpoint accepted the test message.')),
      onError: error => message.error(error.message)
    })
  }

  return (
    <div>
      <PageHeader
        actions={
          <>
            <span className="hidden text-xs sm:inline" style={{ color: palette.inkMuted }}>
              {__('All services are off until you turn them on.')}
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
        Each card is only as tall as its own content (items-start): with the
        grid's default stretch, switching Webhooks on stretched the Slack and
        AI cards beside it to match, so they looked opened too.
        Spacing lives on the grid, not the cards: antd's cssinjs runs at high
        hash priority, so a margin utility on .ant-card loses to its reset.
      */}
      <Form
        className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3"
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
              'Sends the result of each check to your endpoint as JSON. Use this to send changes to other tools.'
            )}
          </p>

          {webhookEnabled && (
            <>
              <Form.Item
                className="mb-5"
                label={__('Endpoint URL')}
                name={['webhook_urls', 0]}
                rules={[{ type: 'url', message: __('Enter a full URL that starts with https://') }]}
              >
                <Input placeholder="https://example.com/hooks/seo" type="url" />
              </Form.Item>

              <Form.Item className="mb-5" label={__('Only send')} name="webhook_threshold">
                <Select options={THRESHOLD_OPTIONS} />
              </Form.Item>

              <Form.Item
                className="mb-0"
                extra={__(
                  'Optional. If you enter a secret, each request has an X-SEO-Monitor-Signature header. Your endpoint can use this header to make sure that the request comes from this site.'
                )}
                label={__('Signing secret')}
                name="webhook_secret"
              >
                <Input.Password
                  autoComplete="off"
                  placeholder={__('Leave this field empty to send no signature')}
                />
              </Form.Item>
            </>
          )}
        </Card>

        <ComingSoonCard
          description={__(
            'Send Critical and Warning changes to a Slack channel. Each alert shows what changed and why this is important.'
          )}
          title={__('Slack')}
        />

        <ComingSoonCard
          // Spans the row on medium screens rather than sitting alone at half width.
          className="lg:col-span-2 2xl:col-span-1"
          description={__(
            'Use your OpenAI or Anthropic key to explain a change in simple English. The explanation shows what changed, the SEO risk, the likely cause and what to do next.'
          )}
          title={__('AI explanations')}
        />
      </Form>
    </div>
  )
}
