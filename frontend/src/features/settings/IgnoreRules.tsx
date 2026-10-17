import { App, Button, Card, Empty, List, Tag } from 'antd'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { useRemoveSuppression, useSuppressions } from '@/api/queries'
import { changeLabel } from '@components/changeLabels'
import When from '@components/When'
import { palette } from '@config/theme'

/**
 * The pro "keep it quiet" rules made from the Mute dialog. Listed here so an
 * "Always ignore" can be undone - without this there is no way back.
 */
export default function IgnoreRules() {
  const { message } = App.useApp()
  const { data: rules, isLoading } = useSuppressions(true)
  const removeRule = useRemoveSuppression()

  return (
    <Card title={__('Ignored changes')}>
      <List
        dataSource={rules ?? []}
        loading={isLoading}
        locale={{
          emptyText: (
            <Empty
              description={__(
                'No changes are ignored. To ignore a change, mute it and select a snooze time or "Always ignore".'
              )}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )
        }}
        renderItem={rule => (
          <List.Item
            actions={[
              <Button
                key="remove"
                loading={removeRule.isPending && removeRule.variables === rule.id}
                size="small"
                onClick={() =>
                  removeRule.mutate(rule.id, {
                    onSuccess: () => message.success(__('Alerts for this change are on again.')),
                    onError: error => message.error(error.message)
                  })
                }
              >
                {__('Stop ignoring')}
              </Button>
            ]}
          >
            <List.Item.Meta
              title={
                <span className="flex items-center gap-2">
                  {changeLabel(rule.change_type)}
                  {rule.until ? (
                    <Tag>{__('Snoozed')}</Tag>
                  ) : (
                    <Tag color="default">{__('Always')}</Tag>
                  )}
                </span>
              }
              description={
                <div className="flex flex-col gap-1">
                  <span style={{ color: palette.inkMuted }}>
                    {rule.target_label ??
                      rule.target_url ??
                      sprintf(__('Page #%d'), rule.target_id)}
                  </span>
                  {rule.until && (
                    <span className="text-xs">
                      {__('Ends')} <When value={rule.until} />
                    </span>
                  )}
                  {rule.note && <span className="text-xs">{rule.note}</span>}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  )
}
