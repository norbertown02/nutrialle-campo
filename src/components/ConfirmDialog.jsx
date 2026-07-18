import { useState, useEffect } from 'react'
import { onConfirmRequest } from '../lib/confirm'

export default function ConfirmDialog() {
  const [pedido, setPedido] = useState(null)

  useEffect(() => {
    onConfirmRequest(setPedido)
    return () => onConfirmRequest(null)
  }, [])

  if (!pedido) return null

  const { message, options, resolve } = pedido

  function responder(valor) {
    setPedido(null)
    resolve(valor)
  }

  return (
    <div
      onClick={() => responder(false)}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 300,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430,
          background: 'var(--bg)',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: '14px 18px 24px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--line)', margin: '0 auto 16px',
        }} />

        {options.title && (
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 20, fontWeight: 600, marginBottom: 6,
          }}>{options.title}</h3>
        )}

        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-dim)', marginBottom: 20 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => responder(false)}
            className="btn btn-ghost"
            style={{ flex: 1, padding: '11px 0' }}
          >
            {options.cancelLabel || 'Cancelar'}
          </button>
          <button
            onClick={() => responder(true)}
            className="btn btn-primary"
            style={{
              flex: 1, padding: '11px 0',
              ...(options.danger ? { background: 'var(--red)' } : {}),
            }}
          >
            {options.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
