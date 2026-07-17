import { useState, useEffect } from 'react'
import { IconCloudOff, IconCloudUpload, IconRefresh } from '@tabler/icons-react'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { onSyncChange, getPendingCount, processOutbox } from '../lib/syncEngine'

export default function SyncStatusBar() {
  const online = useOnlineStatus()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let mounted = true
    async function refresh() {
      const n = await getPendingCount()
      if (mounted) setPending(n)
    }
    refresh()
    const unsubscribe = onSyncChange(refresh)
    return () => { mounted = false; unsubscribe() }
  }, [])

  if (online && pending === 0) return null

  return (
    <div
      onClick={() => { if (online) processOutbox() }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '6px 12px', fontSize: 11, fontWeight: 600,
        background: online ? 'var(--amber-bg)' : 'var(--red-bg)',
        color: online ? 'var(--amber)' : 'var(--red)',
        cursor: online && pending > 0 ? 'pointer' : 'default',
      }}
    >
      {online ? (
        <>
          <IconCloudUpload size={13} />
          {pending === 1 ? '1 registro sincronizando...' : `${pending} registros sincronizando...`}
        </>
      ) : (
        <>
          <IconCloudOff size={13} />
          Sem conexão{pending > 0 ? ` · ${pending} pendente${pending > 1 ? 's' : ''} para enviar` : ''}
        </>
      )}
      {online && pending > 0 && <IconRefresh size={12} style={{ marginLeft: 2 }} />}
    </div>
  )
}
