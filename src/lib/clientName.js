// Padronização de nomes de cliente/fazenda e produtor/responsável.
// Preserva o conteúdo dos demais campos (endereços, e-mails, notas etc.).
export function normalizeClientName(value) {
  return typeof value === 'string' ? value.toLocaleUpperCase('pt-BR') : value
}

export const normalizeProducerName = normalizeClientName

// Normaliza apenas campos que existirem no payload, inclusive updates parciais
// e cadastros antigos aguardando sincronização offline.
export function normalizeClientPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const next = { ...payload }
  for (const key of ['name', 'owner', 'owner_name']) {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      next[key] = normalizeClientName(next[key])
    }
  }
  return next
}
