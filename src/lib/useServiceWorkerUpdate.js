import { useEffect } from 'react'
import { showToast } from './toast'

// Detecta quando uma nova versão do app já foi baixada pelo service worker
// e está esperando para assumir (ver public/sw.js — ela não assume sozinha
// no meio de uma sessão aberta). Quando isso acontece, avisa o usuário com
// um toast persistente; só troca de versão quando ele confirmar, evitando
// que uma tela aberta em campo quebre no meio de uma cotação por causa de
// um chunk que sumiu depois do deploy.
export function useServiceWorkerUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let recarregando = false
    let dismissAtual = null

    function avisarAtualizacao(registration) {
      const waiting = registration.waiting
      if (!waiting) return

      if (dismissAtual) return // já está mostrando o aviso

      dismissAtual = showToast(
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

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // a nova versão assumiu o controle — recarrega uma vez pra garantir
      // que todo o JS/CSS em memória é da versão nova, consistente entre si
      if (recarregando) return
      recarregando = true
      window.location.reload()
    })

    navigator.serviceWorker.getRegistration().then(registration => {
      if (!registration) return

      // já tem uma versão nova esperando desde antes desse carregamento
      if (registration.waiting) avisarAtualizacao(registration)

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            avisarAtualizacao(registration)
          }
        })
      })

      // navegadores só checam por atualização automaticamente ao navegar；
      // como esse é um app que fica aberto por horas em campo, força uma
      // checagem quando a aba volta a ficar visível.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {})
      })
    })
  }, [])
}
