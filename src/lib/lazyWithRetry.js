import { lazy } from 'react'

// React.lazy() normal quebra pra sempre se o import() de um chunk falhar.
// Isso acontece na prática quando o app fica aberto (em campo, offline por
// um tempo) e nesse meio tempo sai um deploy novo: o navegador tenta buscar
// o arquivo JS antigo daquela tela, que já não existe mais no servidor.
// Aqui, se isso acontecer, força um reload único da página (que busca o
// index.html novo, com as referências corretas) em vez de deixar a tela
// presa no Error Boundary. A flag no sessionStorage evita loop infinito
// caso o erro seja outra coisa, não um chunk desatualizado.
export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      const chave = 'nutrialle-chunk-reload'
      if (!sessionStorage.getItem(chave)) {
        sessionStorage.setItem(chave, '1')
        window.location.reload()
        // segura a promise pra sempre — a página está recarregando, não
        // faz sentido resolver ou rejeitar
        return new Promise(() => {})
      }
      sessionStorage.removeItem(chave)
      throw err
    }
  })
}
