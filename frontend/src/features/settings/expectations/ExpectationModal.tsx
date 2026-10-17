import { Alert, App, Button, Checkbox, Form, Input, Modal, Radio, Select, Switch } from 'antd'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { usePageGroups, useSaveExpectation, useTargets, useTestExpectation } from '@/api/queries'
import type { ExpectedRule } from '@/api/types'

const NEW_RULE: Omit<ExpectedRule, 'id'> = {
  name: '',
  enabled: true,
  scope: 'page',
  target_id: null,
  group_id: null,
  checks: { index: null, follow: null, status_200: false, self_canonical: false, schema_types: [] },
  severity: 'critical'
}

const SCHEMA_SUGGESTIONS = [
  'Organization',
  'WebSite',
  'WebPage',
  'Article',
  'Product',
  'FAQPage',
  'BreadcrumbList',
  'LocalBusiness'
]

interface Props {
  /** null = closed; an object without an id = creating. */
  rule: null | Partial<ExpectedRule>
  onClose: () => void
}

export default function ExpectationModal({ rule, onClose }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<ExpectedRule>()
  const { data: targets = [] } = useTargets()
  const { data: groups = [] } = usePageGroups()
  const saveRule = useSaveExpectation()
  const testRule = useTestExpectation()
  const scope = Form.useWatch('scope', form)

  const pages = targets.filter(target => target.type === 'page')

  const submit = async () => {
    const values = await form.validateFields()

    saveRule.mutate(
      { ...values, id: rule?.id ?? '' },
      {
        onSuccess: () => {
          message.success(
            __('Expected state rule saved. SEO Sentry uses this rule in all checks from now on.')
          )
          onClose()
        },
        onError: error => message.error(error.message)
      }
    )
  }

  const runTest = async () => {
    const values = await form.validateFields()
    testRule.mutate(values, { onError: error => message.error(error.message) })
  }

  return (
    <Modal
      destroyOnClose
      confirmLoading={saveRule.isPending}
      okText={__('Save rule')}
      open={rule !== null}
      title={rule?.id ? __('Edit expected state rule') : __('New expected state rule')}
      width={600}
      onCancel={onClose}
      onOk={submit}
    >
      <Form
        form={form}
        initialValues={{ ...NEW_RULE, ...rule, checks: { ...NEW_RULE.checks, ...rule?.checks } }}
        layout="vertical"
        requiredMark={false}
        // A different rule invalidates the last test result.
        onValuesChange={() => testRule.reset()}
      >
        <Form.Item
          label={__('Name')}
          name="name"
          rules={[{ required: true, whitespace: true, message: __('Enter a name for the rule.') }]}
        >
          <Input placeholder={__('For example: Homepage stays indexable')} />
        </Form.Item>

        <Form.Item label={__('Applies to')} name="scope">
          <Radio.Group
            options={[
              { label: __('One page'), value: 'page' },
              { label: __('A page group'), value: 'group', disabled: groups.length === 0 },
              { label: __('Every monitored page'), value: 'all' }
            ]}
          />
        </Form.Item>

        {scope === 'page' && (
          <Form.Item
            label={__('Page')}
            name="target_id"
            rules={[{ required: true, message: __('Select a monitored page.') }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={pages.map(page => ({
                label: `${page.label} — ${page.url}`,
                value: page.id
              }))}
            />
          </Form.Item>
        )}

        {scope === 'group' && (
          <Form.Item
            label={__('Page group')}
            name="group_id"
            rules={[{ required: true, message: __('Select a page group.') }]}
          >
            <Select options={groups.map(group => ({ label: group.name, value: group.id }))} />
          </Form.Item>
        )}

        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <Form.Item label={__('Indexing')} name={['checks', 'index']}>
            <Radio.Group
              options={[
                { label: __('Do not check'), value: null },
                { label: __('Must be indexable'), value: 'index' },
                { label: __('Must stay noindex'), value: 'noindex' }
              ]}
            />
          </Form.Item>

          <Form.Item label={__('Links')} name={['checks', 'follow']}>
            <Radio.Group
              options={[
                { label: __('Do not check'), value: null },
                { label: __('Must be followed'), value: 'follow' },
                { label: __('Must stay nofollow'), value: 'nofollow' }
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item className="mb-2" label={__('Also check')}>
          <div className="flex flex-wrap gap-6">
            <Form.Item noStyle name={['checks', 'status_200']} valuePropName="checked">
              <Checkbox>{__('HTTP 200 (no error, no redirect)')}</Checkbox>
            </Form.Item>
            <Form.Item noStyle name={['checks', 'self_canonical']} valuePropName="checked">
              <Checkbox>{__('Canonical URL is the same as the page URL')}</Checkbox>
            </Form.Item>
          </div>
        </Form.Item>

        <Form.Item
          extra={__(
            'The page must contain all the types in this list. Press Enter after each type.'
          )}
          label={__('Must contain schema')}
          name={['checks', 'schema_types']}
        >
          <Select
            mode="tags"
            options={SCHEMA_SUGGESTIONS.map(type => ({ label: type, value: type }))}
            placeholder="Organization"
          />
        </Form.Item>

        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <Form.Item label={__('Severity if a page fails')} name="severity">
            <Select
              options={[
                { label: __('Critical'), value: 'critical' },
                { label: __('Warning'), value: 'warning' }
              ]}
            />
          </Form.Item>
          <Form.Item label={__('Rule is on')} name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
      </Form>

      <div className="flex flex-col gap-3">
        <Button className="self-start" loading={testRule.isPending} onClick={runTest}>
          {__('Test with the current pages')}
        </Button>

        {testRule.data && testRule.data.covered === 0 && (
          <Alert
            showIcon
            message={__('No checked pages match this rule. There is nothing to test.')}
            type="info"
          />
        )}

        {testRule.data && testRule.data.covered > 0 && testRule.data.failing.length === 0 && (
          <Alert
            showIcon
            message={sprintf(__('All %d pages pass this rule now.'), testRule.data.covered)}
            type="success"
          />
        )}

        {testRule.data && testRule.data.failing.length > 0 && (
          <Alert
            showIcon
            description={
              <ul className="m-0 pl-4">
                {testRule.data.failing.map(page => (
                  <li key={page.url}>
                    <strong>{page.label}</strong> — {page.failures.join('; ')}
                  </li>
                ))}
              </ul>
            }
            message={sprintf(
              __(
                '%1$d of %2$d pages break this rule now. If you save this rule, SEO Sentry will report these pages at the next check.'
              ),
              testRule.data.failing.length,
              testRule.data.covered
            )}
            type="warning"
          />
        )}
      </div>
    </Modal>
  )
}
