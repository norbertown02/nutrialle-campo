import Dexie from 'dexie'

// Banco local (IndexedDB) usado para funcionamento offline do app.
// Guarda dois tipos de coisa:
//  - "cache" de leitura: cópia local dos dados do Supabase (fazendas,
//    produtos, condições de pagamento, cotações) para consulta sem rede.
//  - "outbox": fila de gravações pendentes (cliente novo, cotação nova/
//    editada) criadas offline, que ainda não chegaram ao Supabase.
export const db = new Dexie('nutrialle_campo')

db.version(1).stores({
  farms_cache: 'id, name, city, segment, prospect',
  products_cache: 'id, name, segment, active',
  payment_terms_cache: 'id',
  quotes_cache: 'id, farm_id, status, created_at',
  outbox: '++_seq, entity, entity_id, status, created_at',
})

export default db
