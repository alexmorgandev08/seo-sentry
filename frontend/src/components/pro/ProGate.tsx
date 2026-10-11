import { Modal } from 'antd'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import config from '@config/config'
import ProUpsell from './ProUpsell'
import type { ProFeatureKey } from './proFeatures'
import type { ReactNode } from 'react'

interface ProGateValue {
  /**
   * For a small control (a button, a menu choice): runs `onAllowed` when pro
   * is active (config.IS_PRO), otherwise opens the upgrade modal for that
   * feature.
   */
  requirePro: (feature: ProFeatureKey, onAllowed?: () => void) => void
}

const ProGateContext = createContext<ProGateValue>({
  requirePro: (_feature, onAllowed) => onAllowed?.()
})

/** One modal for the whole app, opened by whichever locked control was used. */
export function ProGateProvider({ children }: { children: ReactNode }) {
  const [feature, setFeature] = useState<null | ProFeatureKey>(null)

  const requirePro = useCallback((key: ProFeatureKey, onAllowed?: () => void) => {
    if (config.IS_PRO) {
      onAllowed?.()

      return
    }

    setFeature(key)
  }, [])

  const value = useMemo(() => ({ requirePro }), [requirePro])
  const close = () => setFeature(null)

  return (
    <ProGateContext.Provider value={value}>
      {children}
      {/* Above other modals: it can open from inside one (the mute dialog).
          The upsell draws its own header band, so the modal adds no padding. */}
      <Modal
        centered
        destroyOnClose
        footer={null}
        open={feature !== null}
        styles={{ content: { overflow: 'hidden', padding: 0 } }}
        width={580}
        zIndex={1100}
        onCancel={close}
      >
        {feature && <ProUpsell feature={feature} onClose={close} />}
      </Modal>
    </ProGateContext.Provider>
  )
}

export const useProGate = () => useContext(ProGateContext)
