import Dexie from 'dexie'

// Banco local (IndexedDB) usado para funcionamento offline e carregamento imediato.
// A UI lê primeiro o cache local e revalida com o Supabase em segundo plano.
export const db = new Dexie('nutrialle_campo')

db.version(1).stores({
  farms_cache: 'id, name, city, segment, prospect',
  products_cache: 'id, name, segment, active',
  payment_terms_cache: 'id',
  quotes_cache: 'id, farm_id, status, created_at',
  outbox: '++_seq, entity, entity_id, status, created_at',
})

db.version(2).stores({
  farms_cache: 'id, name, city, segment, prospect',
  products_cache: 'id, name, segment, active',
  payment_terms_cache: 'id',
  quotes_cache: 'id, farm_id, status, created_at',
  sales_cache: 'id, farm_id, sale_date, ultra_order_id, ultra_status',
  outbox: '++_seq, entity, entity_id, status, created_at',
})

export default db
