import { FolderOpenOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useRef } from 'react'
import { __ } from '@common/helpers/i18nWrap'
import { palette } from '@config/theme'

interface Props {
  disabled: boolean
  value: string | undefined
  /** Called with the chosen image's URL, or '' when the logo is removed. */
  onPick: (url: string) => void
}

interface MediaFrame {
  on: (event: string, callback: () => void) => void
  open: () => void
  state: () => { get: (key: string) => { first: () => { toJSON: () => { url: string } } } }
}

/**
 * The report logo, chosen from the WordPress Media Library, where the user can
 * also upload one. Head.php loads the library on this page (wp_enqueue_media).
 */
export default function LogoPicker({ disabled, value, onPick }: Props) {
  const frame = useRef<MediaFrame | null>(null)
  // The frame is built once, so its select handler reads the latest callback.
  const pick = useRef(onPick)
  pick.current = onPick

  const hasMediaLibrary = typeof wp !== 'undefined' && typeof wp?.media === 'function'

  const browse = () => {
    if (!frame.current) {
      frame.current = wp.media({
        title: __('Select a logo'),
        button: { text: __('Use this logo') },
        library: { type: 'image' },
        multiple: false
      }) as MediaFrame

      frame.current.on('select', () => {
        pick.current(frame.current!.state().get('selection').first().toJSON().url)
      })
    }

    frame.current.open()
  }

  return (
    <div className="flex flex-col gap-2">
      {value && (
        <div
          className="flex items-center justify-between gap-3 rounded-md border border-solid p-2"
          style={{ background: palette.lineSoft, borderColor: palette.line }}
        >
          <img
            alt={__('Report logo')}
            className="max-h-10 max-w-[140px] object-contain"
            src={value}
          />
          <Button danger disabled={disabled} size="small" type="text" onClick={() => onPick('')}>
            {__('Remove')}
          </Button>
        </div>
      )}

      <Button
        block
        disabled={disabled || !hasMediaLibrary}
        icon={<FolderOpenOutlined />}
        onClick={browse}
      >
        {value ? __('Change logo') : __('Browse')}
      </Button>
    </div>
  )
}
