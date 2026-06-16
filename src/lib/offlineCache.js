const KEYS = {
  farms: 'nc_farms',
  products: 'nc_products',
  lastSync: 'nc_last_sync'
}

export function saveFarmsCache(farms) {
  try { localStorage.setItem(KEYS.farms, JSON.stringify(farms)) } catch(e) {}
}

export function loadFarmsCache() {
  try { return JSON.parse(localStorage.getItem(KEYS.farms) || '[]') } catch(e) { return [] }
}

export function saveProductsCache(products) {
  try { localStorage.setItem(KEYS.products, JSON.stringify(products)) } catch(e) {}
}

export function loadProductsCache() {
  try { return JSON.parse(localStorage.getItem(KEYS.products) || '[]') } catch(e) { return [] }
}

// Fila de cotações offline
export function addOfflineQuote(quote) {
  try {
    const queue = JSON.parse(localStorage.getItem('nc_offline_quotes') || '[]')
    queue.push({ ...quote, _offlineId: Date.now() })
    localStorage.setItem('nc_offline_quotes', JSON.stringify(queue))
  } catch(e) {}
}

export function getOfflineQuotes() {
  try { return JSON.parse(localStorage.getItem('nc_offline_quotes') || '[]') } catch(e) { return [] }
}

export function removeOfflineQuote(offlineId) {
  try {
    const queue = JSON.parse(localStorage.getItem('nc_offline_quotes') || '[]')
    localStorage.setItem('nc_offline_quotes', JSON.stringify(queue.filter(q => q._offlineId !== offlineId)))
  } catch(e) {}
}

export function isOnline() {
  return navigator.onLine
}
