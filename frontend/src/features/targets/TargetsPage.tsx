import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Button, Card, Popconfirm, Space, Switch, Table, Tag, Tooltip } from 'antd'
import { useState } from 'react'
import { __, sprintf } from '@common/helpers/i18nWrap'
import {
  useBulkDeleteTargets,
  useBulkUpdateTargets,
  useDeleteTarget,
  useTargets,
  useUpdateTarget
} from '@/api/queries'
import { resultLabel } from '@components/changeLabels'
import PageHeader from '@components/PageHeader'
import When from '@components/When'
import { palette } from '@config/theme'
import AddTargetModal from './AddTargetModal'
import type { Target } from '@/api/types'

const RESULT_TONE: Record<string, string> = {
  ok: 'success',
  changed: 'warning',
  error: 'error',
  impaired: 'default'
}

export default function TargetsPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { message } = App.useApp()
  const { data: targets, isLoading } = useTargets()
  const updateTarget = useUpdateTarget()
  const deleteTarget = useDeleteTarget()
  const bulkUpdate = useBulkUpdateTargets()
  const bulkDelete = useBulkDeleteTargets()

  const toggle = (target: Target, isActive: boolean) => {
    updateTarget.mutate(
      { id: target.id, is_active: isActive },
      { onError: error => message.error(error.message) }
    )
  }

  const remove = (target: Target) => {
    deleteTarget.mutate(target.id, {
      onSuccess: () => message.success(__('Page removed from monitoring.')),
      onError: error => message.error(error.message)
    })
  }

  const bulkToggle = (isActive: boolean) => {
    bulkUpdate.mutate(
      { ids: selectedIds, is_active: isActive },
      {
        onSuccess: () => setSelectedIds([]),
        onError: error => message.error(error.message)
      }
    )
  }

  const bulkRemove = () => {
    const count = selectedIds.length
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        setSelectedIds([])
        message.success(sprintf(__('%d pages removed from monitoring.'), count))
      },
      onError: error => message.error(error.message)
    })
  }

  const isBulkBusy = bulkUpdate.isPending || bulkDelete.isPending

  return (
    <>
      <PageHeader
        actions={
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setIsAdding(true)}>
            {__('Add page')}
          </Button>
        }
        title={__('Monitored Pages')}
      />

      <Card styles={{ body: { padding: 0 } }}>
        {/* Only takes the bar's place when something is selected, so an empty
            selection never costs the page a row of space. */}
        {selectedIds.length > 0 && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-0 border-b border-solid px-4 py-3"
            style={{ background: palette.primarySoft, borderColor: palette.lineSoft }}
          >
            <span className="text-sm font-medium" style={{ color: palette.ink }}>
              {sprintf(__('%d selected'), selectedIds.length)}
            </span>
            <Space size="small" wrap>
              <Button disabled={isBulkBusy} size="small" onClick={() => bulkToggle(true)}>
                {__('Resume monitoring')}
              </Button>
              <Button disabled={isBulkBusy} size="small" onClick={() => bulkToggle(false)}>
                {__('Pause monitoring')}
              </Button>
              <Popconfirm
                cancelText={__('Cancel')}
                okText={__('Remove')}
                title={sprintf(__('Stop monitoring %d pages?'), selectedIds.length)}
                description={__('They stay visible in Change History.')}
                onConfirm={bulkRemove}
              >
                <Button danger disabled={isBulkBusy} icon={<DeleteOutlined />} size="small">
                  {__('Remove')}
                </Button>
              </Popconfirm>
              <Button disabled={isBulkBusy} size="small" type="text" onClick={() => setSelectedIds([])}>
                {__('Clear')}
              </Button>
            </Space>
          </div>
        )}

        <Table<Target>
          dataSource={targets ?? []}
          loading={isLoading}
          pagination={{
            pageSize: 20,
            hideOnSinglePage: false,
            showTotal: (count, range) => sprintf(__('%d-%d of %d'), range[0], range[1], count)
          }}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: keys => setSelectedIds(keys as number[])
          }}
          columns={[
            {
              title: __('Page'),
              dataIndex: 'label',
              render: (label: string, target) => (
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{label}</span>
                  <a
                    className="truncate text-xs"
                    href={target.url}
                    rel="noreferrer"
                    style={{ color: palette.inkFaint }}
                    target="_blank"
                  >
                    {target.url}
                  </a>
                </div>
              )
            },
            {
              title: __('Last checked'),
              dataIndex: 'last_checked_at',
              width: 150,
              render: (value: null | string) => <When fallback={__('Not yet')} value={value} />
            },
            {
              title: __('Result'),
              dataIndex: 'last_result',
              width: 120,
              render: (result: null | string) =>
                result ? (
                  <Tag bordered={false} color={RESULT_TONE[result] ?? 'default'}>
                    {resultLabel(result)}
                  </Tag>
                ) : null
            },
            {
              title: __('Monitoring'),
              dataIndex: 'is_active',
              width: 120,
              render: (isActive: number, target) => (
                <Switch
                  checked={Boolean(isActive)}
                  size="small"
                  onChange={checked => toggle(target, checked)}
                />
              )
            },
            {
              title: __('Remove'),
              width: 90,
              align: 'center',
              render: (_, target) => (
                <Popconfirm
                  cancelText={__('Cancel')}
                  okText={__('Remove')}
                  title={__('Stop monitoring this page?')}
                  description={__('It stays visible in Change History.')}
                  onConfirm={() => remove(target)}
                >
                  <Tooltip title={__('Remove')}>
                    <Button
                      aria-label={__('Remove')}
                      className="scm-row-remove"
                      icon={<DeleteOutlined />}
                      size="small"
                      type="text"
                    />
                  </Tooltip>
                </Popconfirm>
              )
            }
          ]}
        />
      </Card>

      <AddTargetModal open={isAdding} onClose={() => setIsAdding(false)} />
    </>
  )
}
