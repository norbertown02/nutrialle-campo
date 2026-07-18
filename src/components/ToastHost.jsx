import { useState, useEffect } from 'react'
import { IconAlertCircle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react'
import { onToastChange, getToasts, dismissToast } from '../lib/toast'

const STYLES = {
  error:   { bg: 'var(--red-bg)',    color: 'var(--red)',    Icon: IconAlertCircle },
  success: { bg: 'var(--green-bg)',  color: 'var(--green)',  Icon: IconCheck },
  info:    { bg: 'var(--amber-bg)',  color: 'var(--amber)',  Icon: IconInfoCircle },
}

export default function ToastHost() {
  const [toasts, setToasts] = useState(getToasts())

  useEffect(() => onToastChange(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 74, zIndex: 200,
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '0 16px', maxWidth: 430, margin: '0 auto',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const cfg = STYLES[t.type] || STYLES.info
        const Icon = cfg.Icon
        return (
          <div key={t.id}
            onClick={() => dismissToast(t.id)}
            style={{
              pointerEvents: 'auto', cursor: 'pointer',
              background: cfg.bg, color: cfg.color,
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', alignItems: 'flex-start', gap: 8,
              fontSize: 12.5, lineHeight: 1.4, whiteSpace: 'pre-line',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            }}>
            <Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>{t.message}</div>
            {t.action && (
              <button
                onClick={(e) => { e.stopPropagation(); t.action.onClick(); dismissToast(t.id) }}
                style={{
                  flexShrink: 0, pointerEvents: 'auto', background: 'transparent',
                  border: `1px solid ${cfg.color}`, color: cfg.color, borderRadius: 6,
                  padding: '3px 8px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {t.action.label}
              </button>
            )}
            <IconX size={14} style={{ flexShrink: 0, opacity: 0.7, marginTop: 1 }} />
          </div>
        )
      })}
    </div>
  )
}
