import { useState } from 'react'
import { IconSend, IconSparkles, IconAlertCircle } from '@tabler/icons-react'
import { supabase } from '../lib/supabase'

const AI_URL = import.meta.env.VITE_NUTRIALLE_AI_URL || 'http://127.0.0.1:8787'
const starter = [{ role: 'assistant', content: 'Olá! Sou a Nutrialle IA em versão de testes. Posso conversar sobre nutrição animal. As consultas aos cadastros do Ultra e do Campo ainda não estão ativadas.' }]

export default function NutrialleIA() {
  const [messages, setMessages] = useState(starter)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send(e) {
    e.preventDefault()
    const question = draft.trim()
    if (!question || busy) return
    const next = [...messages, { role: 'user', content: question }]
    setMessages(next)
    setDraft('')
    setBusy(true)
    setError('')
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) throw new Error('Faça login novamente para utilizar a IA.')
      const response = await fetch(AI_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ messages: next.slice(-10).map(({ role, content }) => ({ role, content })) }),
        signal: AbortSignal.timeout(90000)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao consultar a IA.')
      setMessages(previous => [...previous, { role: 'assistant', content: data.answer }])
    } catch (err) {
      setError(err.message || 'Não foi possível conectar à IA local.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 850, margin: '0 auto', padding: '20px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ borderRadius: 18, padding: 22, color: '#fff', background: 'linear-gradient(110deg, #141414 30%, #9c4017 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconSparkles size={27} /><h1 style={{ margin: 0, fontSize: 25 }}>Nutrialle IA</h1></div>
        <p style={{ margin: '8px 0 0', opacity: 0.85 }}>Seu assistente comercial e técnico · Protótipo local</p>
      </header>
      <section aria-live="polite" style={{ minHeight: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((item, i) => <div key={i} style={{ alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', background: item.role === 'user' ? '#f9dec9' : '#f4f4f4', padding: '12px 15px', borderRadius: 15, color: '#202020', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.content}</div>)}
        {busy && <p style={{ color: '#777' }}>Nutrialle IA está respondendo...</p>}
      </section>
      {error && <div role="alert" style={{ color: '#a23425', display: 'flex', gap: 8, alignItems: 'center' }}><IconAlertCircle size={19}/>{error}</div>}
      <form onSubmit={send} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input aria-label="Pergunte à Nutrialle IA" value={draft} onChange={e => setDraft(e.target.value)} disabled={busy} maxLength={2000} placeholder="Pergunte à Nutrialle IA..." style={{ flex: 1, minWidth: 0, padding: 15, border: '1px solid #ddd', borderRadius: 12, background: '#fff', color: '#222' }}/>
        <button aria-label="Enviar pergunta" type="submit" disabled={busy || !draft.trim()} style={{ background: '#e76a22', border: 0, borderRadius: 12, padding: 13, color: '#fff', cursor: 'pointer' }}><IconSend size={20}/></button>
      </form>
      <small style={{ color: '#777' }}>Teste local: as respostas técnicas devem ser verificadas. Nenhuma consulta ao banco ou alteração de dados é feita pela IA nesta versão.</small>
    </main>
  )
}
