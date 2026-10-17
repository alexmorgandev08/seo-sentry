import { Alert, App, Button, Card, Empty, List, Popconfirm, Switch, Tag } from 'antd'
import { useState } from 'react'
import { __ } from '@common/helpers/i18nWrap'
import {
  useDeleteExpectation,
  useExpectations,
  usePageGroups,
  useSaveExpectation,
  useTargets
} from '@/api/queries'
import type { ExpectedChecks, ExpectedRule } from '@/api/types'
import ExpectationModal from './ExpectationModal'

/** "indexable · followed · HTTP 200 · self-canonical · Organization schema" */
const describeChecks = (checks: ExpectedChecks) =>
  [
    checks.index === 'index' && __('indexable'),
    checks.index === 'noindex' && __('noindex'),
    checks.follow === 'follow' && __('followed'),
    checks.follow === 'nofollow' && __('nofollow'),
    checks.status_200 && __('HTTP 200'),
    checks.self_canonical && __('self-canonical'),
    checks.schema_types.length > 0 && `${checks.schema_types.join(', ')} ${__('schema')}`
  ]
    .filter(Boolean)
    .join(' · ')

/**
 * Pro: rules about how pages must look. Unlike change alerts, these judge
 * each page as it is - including a page that was wrong from day one.
 */
export default function ExpectedStateSettings() {
  const { message } = App.useApp()
  const { data: rules = [], isLoading } = useExpectations()
  const { data: targets = [] } = useTargets()
  const { data: groups = [] } = usePageGroups()
  const saveRule = useSaveExpectation()
  const deleteRule = useDeleteExpectation()
  const [editing, setEditing] = useState<null | Partial<ExpectedRule>>(null)

  const onError = (error: Error) => message.error(error.message)

  const scopeLabel = (rule: ExpectedRule) => {
    if (rule.scope === 'all') return __('Every monitored page')
    if (rule.scope === 'group') {
      return groups.find(group => group.id === rule.group_id)?.name ?? __('(page group not found)')
    }

    return targets.find(target => target.id === rule.target_id)?.label ?? __('(page removed)')
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert
        showIcon
        message={__(
          'Change alerts find only pages that change. During each check, SEO Sentry also compares each page with its expected state rules. This finds pages that were incorrect from the start. SEO Sentry sends 1 alert, and the change stays open until the page is correct.'
        )}
        type="info"
      />

      <Card
        extra={
          <Button type="primary" onClick={() => setEditing({})}>
            {__('Add rule')}
          </Button>
        }
        title={__('Expected state')}
      >
        <List
          dataSource={rules}
          loading={isLoading}
          locale={{
            emptyText: (
              <Empty
                description={__(
                  'There are no expected state rules. For example: the homepage must stay indexable, return HTTP 200 and contain Organization schema.'
                )}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
          renderItem={rule => (
            <List.Item
              actions={[
                <Switch
                  key="enabled"
                  checked={rule.enabled}
                  size="small"
                  onChange={enabled => saveRule.mutate({ ...rule, enabled }, { onError })}
                />,
                <Button key="edit" size="small" onClick={() => setEditing(rule)}>
                  {__('Edit')}
                </Button>,
                <Popconfirm
                  key="delete"
                  title={__('Delete this expected state rule?')}
                  onConfirm={() => deleteRule.mutate({ id: rule.id }, { onError })}
                >
                  <Button danger size="small">
                    {__('Delete')}
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                description={`${scopeLabel(rule)} — ${describeChecks(rule.checks)}`}
                title={
                  <span className="flex items-center gap-2">
                    {rule.name}
                    <Tag color={rule.severity === 'critical' ? 'red' : 'orange'}>
                      {rule.severity === 'critical' ? __('Critical') : __('Warning')}
                    </Tag>
                    {!rule.enabled && <Tag>{__('Off')}</Tag>}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <ExpectationModal rule={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
