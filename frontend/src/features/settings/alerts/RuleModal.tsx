import { App, Checkbox, Form, Input, Modal, Radio, Select, Switch } from 'antd'
import { __ } from '@common/helpers/i18nWrap'
import { useSaveAlertRule } from '@/api/queries'
import { changeLabel } from '@components/changeLabels'
import type { AlertMeta, AlertRule, PageGroup } from '@/api/types'

const NEW_RULE: Omit<AlertRule, 'id'> = {
  name: '',
  enabled: true,
  min_severity: 'warning',
  change_types: [],
  scope: 'any',
  group_id: null,
  emails: [],
  webhook: false,
  mode: 'immediate'
}

export const SEVERITY_OPTIONS = [
  { label: __('Critical only'), value: 'critical' },
  { label: __('Warning and above'), value: 'warning' },
  { label: __('Everything, including info'), value: 'info' }
]

interface Props {
  /** null = closed; an object without an id = creating. */
  rule: null | Partial<AlertRule>
  groups: PageGroup[]
  meta: AlertMeta | undefined
  onClose: () => void
}

export default function RuleModal({ rule, groups, meta, onClose }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<AlertRule>()
  const saveRule = useSaveAlertRule()
  const scope = Form.useWatch('scope', form)

  const submit = async () => {
    const values = await form.validateFields()

    saveRule.mutate(
      { ...values, id: rule?.id ?? '' },
      {
        onSuccess: () => {
          message.success(__('Alert rule saved.'))
          onClose()
        },
        onError: error => message.error(error.message)
      }
    )
  }

  return (
    <Modal
      destroyOnClose
      confirmLoading={saveRule.isPending}
      okText={__('Save rule')}
      open={rule !== null}
      title={rule?.id ? __('Edit alert rule') : __('New alert rule')}
      width={560}
      onCancel={onClose}
      onOk={submit}
    >
      <Form
        form={form}
        initialValues={{ ...NEW_RULE, ...rule }}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          label={__('Name')}
          name="name"
          rules={[{ required: true, whitespace: true, message: __('Give the rule a name.') }]}
        >
          <Input placeholder={__('e.g. Money pages to the client')} />
        </Form.Item>

        <Form.Item label={__('Alert on')} name="min_severity">
          <Select options={SEVERITY_OPTIONS} />
        </Form.Item>

        <Form.Item
          extra={__('Leave empty to include every kind of change.')}
          label={__('Only these changes')}
          name="change_types"
        >
          <Select
            allowClear
            mode="multiple"
            optionFilterProp="label"
            options={(meta?.change_types ?? []).map(type => ({
              label: changeLabel(type),
              value: type
            }))}
            placeholder={__('Any change')}
          />
        </Form.Item>

        <Form.Item label={__('On which pages')} name="scope">
          <Select
            options={[
              { label: __('Any monitored page'), value: 'any' },
              {
                label: __('Site-wide checks (robots.txt, sitemap, indexing setting)'),
                value: 'site'
              },
              { label: __('A page group'), value: 'group', disabled: groups.length === 0 }
            ]}
          />
        </Form.Item>

        {scope === 'group' && (
          <Form.Item
            label={__('Page group')}
            name="group_id"
            rules={[{ required: true, message: __('Choose a page group.') }]}
          >
            <Select options={groups.map(group => ({ label: group.name, value: group.id }))} />
          </Form.Item>
        )}

        <Form.Item
          extra={__('Press Enter or comma after each address.')}
          label={__('Email to')}
          name="emails"
        >
          <Select
            mode="tags"
            open={false}
            placeholder="client@example.com"
            tokenSeparators={[',', ' ']}
          />
        </Form.Item>

        <Form.Item
          className="mb-2"
          extra={__('Uses the webhook addresses set on the Integrations page.')}
          label={__('Also send to')}
        >
          <div className="flex gap-6">
            <Form.Item noStyle name="webhook" valuePropName="checked">
              <Checkbox>{__('Webhooks')}</Checkbox>
            </Form.Item>
          </div>
        </Form.Item>

        <Form.Item label={__('When')} name="mode">
          <Radio.Group
            options={[
              { label: __('Right after each check'), value: 'immediate' },
              { label: __('Once a day, at 8:00'), value: 'daily' }
            ]}
          />
        </Form.Item>

        <Form.Item className="mb-0" label={__('Rule is on')} name="enabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
