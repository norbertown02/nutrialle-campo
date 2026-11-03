import http from 'node:http'
import { createClient } from '@supabase/supabase-js'

const PORT = Number(process.env.AI_PORT || 8787)
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kruldbtjyhfiswmwmoyz.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
const MODEL = process.env.AI_MODEL || 'qwen3.5:4b'
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173'])
if (!SUPABASE_PUBLISHABLE_KEY) {
  console.error('Configure SUPABASE_PUBLISHABLE_KEY no terminal antes de iniciar o gateway.')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const system = 'Você é Nutrialle IA, protótipo. Responda em português brasileiro, de forma objetiva. Não afirme ter acesso ao Ultra, banco, estoque, preços ou documentos. Para dados cadastrais não fornecidos nesta conversa, diga que a integração ainda não está habilitada. Não invente NCM, preços nem níveis de garantia.'
const send = (res, code, data, origin) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': origin || 'null', Vary: 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' })
  res.end(JSON.stringify(data))
}
http.createServer(async (req, res) => {
  const origin = req.headers.origin
  if (origin && !allowedOrigins.has(origin)) return send(res, 403, { error: 'Origem não autorizada.' })
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin)
  if (req.url !== '/chat' || req.method !== 'POST') return send(res, 404, { error: 'Rota indisponível.' }, origin)
  try {
    const auth = req.headers.authorization || ''
    if (!auth.startsWith('Bearer ')) return send(res, 401, { error: 'Autenticação necessária.' }, origin)
    const { data: { user }, error: authError } = await supabase.auth.getUser(auth.slice(7))
    if (authError || !user) return send(res, 401, { error: 'Sessão inválida.' }, origin)
    let body = ''
    for await (const chunk of req) {
      body += chunk.toString()
      if (body.length > 15000) return send(res, 413, { error: 'Mensagem muito longa.' }, origin)
    }
    const parsed = JSON.parse(body)
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0 || parsed.messages.length > 10 || parsed.messages.some(m => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 2000)) return send(res, 400, { error: 'Mensagens inválidas.' }, origin)
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, stream: false, messages: [{ role: 'system', content: system }, ...parsed.messages], options: { num_ctx: 4096, num_predict: 450 }, keep_alive: '2m' }),
      signal: AbortSignal.timeout(85000)
    })
    if (!response.ok) throw new Error('Ollama indisponível: HTTP ' + response.status)
    const answer = (await response.json()).message?.content
    if (typeof answer !== 'string') throw new Error('Resposta inválida do modelo.')
    return send(res, 200, { answer }, origin)
  } catch (error) {
    console.error('Falha Nutrialle IA:', error.message)
    return send(res, 502, { error: 'O modelo local não respondeu. Verifique se o Ollama está aberto.' }, origin)
  }
}).listen(PORT, '127.0.0.1', () => console.log('Nutrialle IA local: http://127.0.0.1:' + PORT))
