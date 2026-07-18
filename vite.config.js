import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Só agrupamos manualmente as libs que (a) são realmente necessárias já no
// primeiro carregamento (React, roteador, Supabase, Dexie — usadas antes de
// qualquer tela lazy renderizar) e (b) mudam bem menos que o código do app,
// então ficam cacheadas no navegador entre deploys.
//
// @tabler/icons-react, recharts e as libs de PDF ficam de fora de propósito:
// o code-splitting automático do Vite já separa cada uma por tela lazy e,
// nesse processo, faz um tree-shake correto (só entra no bundle o ícone que
// aquela tela específica importa). Forçá-las num chunk único faz o bundler
// perder esse tree-shake e incluir a biblioteca inteira — testado e revertido.
function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined

  if (
    id.includes('react-router-dom') ||
    /[\\/]node_modules[\\/]react[\\/]/.test(id) ||
    id.includes('node_modules/react-dom')
  ) {
    return 'vendor-react'
  }
  if (id.includes('@supabase')) return 'vendor-supabase'
  if (id.includes('node_modules/dexie')) return 'vendor-dexie'

  return undefined
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
