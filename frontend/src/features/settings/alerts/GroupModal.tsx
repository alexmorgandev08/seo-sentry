import { App, Form, Input, Modal, Select } from 'antd'
import { __ } from '@common/helpers/i18nWrap'
import { useSavePageGroup } from '@/api/queries'
import type { AlertMeta, PageGroup } from '@/api/types'

const NEW_GROUP: Omit<PageGroup, 'id'> = {
  name: '',
  post_types: [],
  url_patterns: [],
  frequency: 'inherit'
}

export const FREQUENCY_OPTIONS = [
  { label: __('Same as the site setting'), value: 'inherit' },
  { label: __('Every hour'), value: 'hourly' },
  { label: __('Twice a day'), value: 'twicedaily' },
  { label: __('Once a day'), value: 'daily' },
  { label: __('Once a week'), value: 'weekly' }
]

interface Props {
  /** null = closed; an object without an id = creating. */
  group: null | Partial<PageGroup>
  meta: AlertMeta | undefined
  onClose: () => void
}

export default function GroupModal({ group, meta, onClose }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<PageGroup>()
  const saveGroup = useSavePageGroup()

  const submit = async () => {
    const values = await form.validateFields()

    saveGroup.mutate(
      { ...values, id: group?.id ?? '' },
      {
        onSuccess: () => {
          message.success(__('Page group saved.'))
          onClose()
        },
        onError: error => message.error(error.message)
      }
    )
  }

  return (
    <Modal
      destroyOnClose
      confirmLoading={saveGroup.isPending}
      okText={__('Save page group')}
      open={group !== null}
      title={group?.id ? __('Edit page group') : __('New page group')}
      width={560}
      onCancel={onClose}
      onOk={submit}
    >
      <Form
        form={form}
        initialValues={{ ...NEW_GROUP, ...group }}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          label={__('Name')}
          name="name"
          rules={[
            { required: true, whitespace: true, message: __('Enter a name for the page group.') }
          ]}
        >
          <Input placeholder={__('For example: Important pages')} />
        </Form.Item>

        <Form.Item label={__('Pages of these types')} name="post_types">
          <Select
            allowClear
            mode="multiple"
            optionFilterProp="label"
            options={meta?.post_types ?? []}
            placeholder={__('For example: Products')}
          />
        </Form.Item>

        <Form.Item
          extra={__(
            'Use * as a wildcard. Start with / to match the path, for example: /blog/* or /pricing/. A page is in this page group if it matches 1 or more of the types or patterns.'
          )}
          label={__('Or URLs that match')}
          name="url_patterns"
        >
          <Select mode="tags" open={false} placeholder="/shop/*" tokenSeparators={[',', ' ']} />
        </Form.Item>

        <Form.Item
          className="mb-0"
          extra={__(
            'Check important pages more frequently and other pages less frequently. If a page is in more than 1 page group, SEO Sentry uses the most frequent setting.'
          )}
          label={__('Check these pages')}
          name="frequency"
        >
          <Select options={FREQUENCY_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
