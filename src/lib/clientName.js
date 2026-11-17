// Padronização exclusiva do nome do cliente/fazenda, sem alterar
// produtor, endereço, e-mail, notas ou quaisquer outros campos.
export function normalizeClientName(value) {
  return typeof value === 'string' ? value.toLocaleUpperCase('pt-BR') : value
}

export function normalizeClientPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  if (!Object.prototype.hasOwnProperty.call(payload, 'name')) return payload
  return { ...payload, name: normalizeClientName(payload.name) }
}
