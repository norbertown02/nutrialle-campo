// Substitui window.confirm() (bloqueante, feio, inconsistente com o resto
// do app) por um modal próprio. Continua com a mesma API de uso — um
// await que resolve true/false — só que sem travar a thread do navegador
// e com a cara do app.
let listener = null

export function onConfirmRequest(cb) {
  listener = cb
}

// options: { title, confirmLabel, cancelLabel, danger }
export function confirmDialog(message, options = {}) {
  return new Promise(resolve => {
    if (!listener) {
      // fallback de segurança, não deveria acontecer já que o
      // ConfirmDialog fica montado no App inteiro
      resolve(window.confirm(message))
      return
    }
    listener({ message, options, resolve })
  })
}
