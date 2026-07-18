// Sistema simples de notificação (substitui alert() por um aviso não
// bloqueante, consistente com o resto do app). Sem dependência externa:
// um pub/sub minúsculo que o ToastHost escuta e renderiza.

const listeners = new Set()
let nextId = 1

export function onToastChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

let toasts = []

function notify() {
  listeners.forEach(cb => {
    try { cb(toasts) } catch (e) { console.warn('Listener de toast falhou:', e) }
  })
}

export function getToasts() {
  return toasts
}

// type: 'error' | 'success' | 'info'
// options.action: { label, onClick } — botão extra dentro do toast (ex: "Atualizar")
// duration = 0 mantém o toast até o usuário interagir (usado para coisas que exigem ação, tipo nova versão disponível)
export function showToast(message, type = 'info', duration = 6000, options = {}) {
  const id = nextId++
  toasts = [...toasts, { id, message, type, action: options.action || null }]
  notify()
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration)
  }
  return id
}

export function dismissToast(id) {
  toasts = toasts.filter(t => t.id !== id)
  notify()
}
