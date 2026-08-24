import { useEffect } from 'react'
import { showToast } from './toast'

export function useServiceWorkerUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let reloading = false
    let dismissUpdate = null

    function notifyUpdate(registration) {
      const waiting = registration.waiting
      if (!waiting || dismissUpdate) return

      dismissUpdate = showToast(
        'Nova versão do app disponível.',
        'info',
        0,
        {
          action: {
            label: 'Atualizar',
            onClick: () => waiting.postMessage('SKIP_WAITING'),
          },
        }
      )
    }

    const onControllerChange = () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker.ready.then(registration => {
      // Não espera o navegador decidir quando procurar por uma nova versão.
      // Toda abertura do Campo força uma checagem do SW no servidor.
      registration.update().catch(() => {})

      if (registration.waiting) notifyUpdate(registration)

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdate(registration)
          }
        })
      })

      const checkForUpdate = () => registration.update().catch(() => {})

      // Se o aparelho recupera conexão depois de trabalhar offline,
      // verifica imediatamente se há atualização pendente.
      window.addEventListener('online', checkForUpdate)

      // Em sessões longas, verifica quando o usuário volta ao app.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
    })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])
}
