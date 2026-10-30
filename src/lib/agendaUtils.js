// Datas da agenda em hora local para não avançar um dia no fuso brasileiro.
export function hojeLocal(data = new Date()) {
  return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0') + '-' + String(data.getDate()).padStart(2, '0')
}
export function deslocarData(iso, dias) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const dt = new Date(ano, mes - 1, dia + dias, 12)
  return hojeLocal(dt)
}
export function formatarDia(iso, completo = false) {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia, 12).toLocaleDateString('pt-BR',
    completo ? { weekday: 'long', day: '2-digit', month: 'long' } : { day: '2-digit', month: 'short' })
}
export function diasRelativos(iso, hoje = hojeLocal()) {
  if (!iso) return 0
  const valor = value => {
    const [y, m, d] = value.split('-').map(Number)
    return Date.UTC(y, m - 1, d) / 86400000
  }
  return valor(iso) - valor(hoje)
}
export function itensAgenda(appointments, visits) {
  const realizados = new Map()
  for (const v of visits) {
    if (!v.farmId || !v.visitDate) continue
    const atual = realizados.get(v.farmId)
    if (!atual || v.visitDate > atual) realizados.set(v.farmId, v.visitDate)
  }
  const automáticos = visits.filter(v => v.nextVisitDate && v.farmId)
    .map(v => ({
      id: 'retorno_' + v.id, originalId: v.id, farmId: v.farmId,
      date: v.nextVisitDate, time: '',
      title: 'Visita de retorno', notes: v.notes || '',
      kind: 'visita', automatico: true,
      status: realizados.get(v.farmId) >= v.nextVisitDate ? 'realizado' : 'agendado',
    }))
  const manuais = appointments.map(a => ({
    ...a, date: a.appointmentDate, time: a.appointmentTime || '',
    kind: a.kind || 'visita', automatico: false,
  }))
  // Evita duplicar o retorno: NovaVisita grava um compromisso e a data de retorno da visita.
  const diasManuais = new Set(manuais.filter(a => a.kind === 'visita' && a.farmId)
    .map(a => a.farmId + '@' + a.date))
  return [...manuais, ...automáticos.filter(a => !diasManuais.has(a.farmId + '@' + a.date))].sort((a,b) =>
    (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''))
}
export function visitasDeAmanha(appointments, visits, hoje = hojeLocal()) {
  const tomorrow = deslocarData(hoje, 1)
  return itensAgenda(appointments, visits)
    .filter(i => i.date === tomorrow && i.kind === 'visita' && i.status === 'agendado')
}
