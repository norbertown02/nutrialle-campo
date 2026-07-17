import { db } from './db'
import { supabase } from './supabase'

// Motor de sincronização: processa a fila "outbox" (gravações feitas
// offline) e envia para o Supabase assim que há conexão. Usa upsert/
// update idempotentes — reenviar o mesmo item não duplica nada, porque
// o id é gerado no aparelho no momento da criação (crypto.randomUUID()).

const TABLE_BY_ENTITY = {
  farm: 'farms',
  quote: 'quotes',
}

// Ordem de sincronização: fazendas antes de cotações, porque uma
// cotação pode referenciar uma fazenda que ainda não chegou ao servidor.
const ENTITY_ORDER = { farm: 0, quote: 1 }

let syncing = false
const listeners = new Set()

function notify() {
  listeners.forEach(cb => {
    try { cb() } catch (e) {}
  })
}

export function onSyncChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export async function getPendingCount() {
  return db.outbox.where('status').anyOf('pending', 'syncing', 'failed').count()
}

export async function getOutboxItems() {
  return db.outbox.orderBy('created_at').toArray()
}

// entity: 'farm' | 'quote'
// op: 'upsert' (criação — envia a linha inteira) | 'update' (edição — envia só o que mudou)
export async function enqueue({ entity, entityId, op, payload }) {
  await db.outbox.add({
    entity,
    entity_id: entityId,
    op,
    payload,
    status: 'pending',
    attempts: 0,
    error: null,
    created_at: new Date().toISOString(),
  })
  notify()
  // tenta sincronizar na hora, sem bloquear quem chamou enqueue()
  processOutbox()
}

export async function processOutbox() {
  if (syncing) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  syncing = true
  notify()

  try {
    const pendentes = await db.outbox.where('status').anyOf('pending', 'failed').toArray()
    pendentes.sort((a, b) => {
      const ordA = ENTITY_ORDER[a.entity] ?? 9
      const ordB = ENTITY_ORDER[b.entity] ?? 9
      if (ordA !== ordB) return ordA - ordB
      return String(a.created_at).localeCompare(String(b.created_at))
    })

    for (const item of pendentes) {
      await db.outbox.update(item._seq, { status: 'syncing' })
      notify()

      const table = TABLE_BY_ENTITY[item.entity]
      let error = null

      try {
        if (item.op === 'update') {
          const res = await supabase.from(table).update(item.payload).eq('id', item.entity_id)
          error = res.error
        } else {
          const res = await supabase.from(table).upsert(item.payload, { onConflict: 'id' })
          error = res.error
        }
      } catch (e) {
        error = e
      }

      if (!error) {
        await db.outbox.delete(item._seq)
        await marcarSincronizado(item.entity, item.entity_id)
      } else {
        await db.outbox.update(item._seq, {
          status: 'failed',
          error: error.message || String(error),
          attempts: (item.attempts || 0) + 1,
        })
      }
      notify()
    }
  } finally {
    syncing = false
    notify()
  }
}

async function marcarSincronizado(entity, entityId) {
  const cacheTable = entity === 'farm' ? db.farms_cache : entity === 'quote' ? db.quotes_cache : null
  if (!cacheTable) return
  const row = await cacheTable.get(entityId)
  if (row) await cacheTable.update(entityId, { _pending: false })
}

let started = false

export function startAutoSync() {
  if (started || typeof window === 'undefined') return
  started = true

  window.addEventListener('online', () => processOutbox())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') processOutbox()
  })
  // tentativa periódica de segurança enquanto o app está aberto
  setInterval(() => processOutbox(), 30000)
  // tenta uma vez ao carregar, caso já esteja online
  processOutbox()
}
