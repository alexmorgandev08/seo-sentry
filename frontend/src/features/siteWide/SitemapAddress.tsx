import { App, Button, Input, Space } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { __ } from '@common/helpers/i18nWrap'
import call from '@/api/client'
import { useSettings, useUpdateSettings } from '@/api/queries'
import { palette } from '@config/theme'

interface Props {
  /** Start open: no sitemap was found, so entering its address is the next step. */
  open: boolean
}

/**
 * The sitemap address, set on the card that shows the problem rather than only
 * in Settings, where people did not look for it. Saving checks the sitemap at
 * once, so the card shows the result without waiting for the next check.
 */
export default function SitemapAddress({ open }: Props) {
  const { message } = App.useApp()
  const client = useQueryClient()
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const [isOpen, setIsOpen] = useState(open)
  // null until the user types: until then the field shows the saved address.
  const [typed, setTyped] = useState<null | string>(null)

  const checkSitemap = useMutation({
    mutationFn: () => call<unknown>('status/check-sitemap'),
    onSuccess: status => client.setQueryData(['site-status'], status)
  })

  const address = typed ?? settings?.sitemap_url ?? ''
  const isBusy = updateSettings.isPending || checkSitemap.isPending
  const onError = (error: Error) => message.error(error.message)

  const saveAndCheck = () =>
    updateSettings.mutate(
      { sitemap_url: address.trim() },
      {
        onSuccess: () =>
          checkSitemap.mutate(undefined, {
            onSuccess: () => message.success(__('SEO Sentry checked the sitemap.')),
            onError
          }),
        onError
      }
    )

  if (!isOpen) {
    return (
      <Button className="self-start p-0" size="small" type="link" onClick={() => setIsOpen(true)}>
        {__('Use a different address')}
      </Button>
    )
  }

  return (
    <div
      className="flex flex-col gap-1.5 border-0 border-t border-solid pt-3"
      style={{ borderColor: palette.lineSoft }}
    >
      <label className="text-xs font-medium" htmlFor="seo-sentry-sitemap-url">
        {__('Sitemap address')}
      </label>
      <Space.Compact block>
        <Input
          disabled={!settings || isBusy}
          id="seo-sentry-sitemap-url"
          placeholder="https://example.com/sitemap_index.xml"
          type="url"
          value={address}
          onChange={event => setTyped(event.target.value)}
          onPressEnter={saveAndCheck}
        />
        <Button disabled={!settings} loading={isBusy} type="primary" onClick={saveAndCheck}>
          {__('Save and check')}
        </Button>
      </Space.Compact>
      <span className="text-xs" style={{ color: palette.inkMuted }}>
        {__('Leave this field empty, and SEO Sentry finds the sitemap automatically.')}
      </span>
    </div>
  )
}
