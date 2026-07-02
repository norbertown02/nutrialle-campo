import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const FAZENDAS = [
  { id: 1, nome: 'Fazenda São João', responsavel: 'Carlos Mendes', regiao: 'Sudoeste SP', segmento: 'leite', nota: 82, ultimaVisita: '2025-05-10', animais: 120 },
  { id: 2, nome: 'Sítio Boa Esperança', responsavel: 'Ana Lima', regiao: 'Sudoeste SP', segmento: 'leite', nota: 61, ultimaVisita: '2025-05-08', animais: 80 },
  { id: 3, nome: 'Fazenda Progresso', responsavel: 'José Alves', regiao: 'Norte SP', segmento: 'corte', nota: 74, ultimaVisita: '2025-04-30', animais: 340 },
  { id: 4, nome: 'Granja Santa Rita', responsavel: 'Marcos Souza', regiao: 'Norte SP', segmento: 'suinos', nota: 88, ultimaVisita: '2025-05-12', animais: 600 },
  { id: 5, nome: 'Fazenda Horizonte', responsavel: 'Pedro Costa', regiao: 'Leste SP', segmento: 'corte', nota: 45, ultimaVisita: '2025-04-20', animais: 210 },
  { id: 6, nome: 'Sítio das Flores', responsavel: 'Maria Santos', regiao: 'Leste SP', segmento: 'leite', nota: 70, ultimaVisita: '2025-05-01', animais: 95 },
  { id: 7, nome: 'Fazenda Palmeira', responsavel: 'Roberto Nunes', regiao: 'Sul SP', segmento: 'suinos', nota: 55, ultimaVisita: '2025-04-15', animais: 450 },
  { id: 8, nome: 'Agropecuária Vale Verde', responsavel: 'Fernanda Rocha', regiao: 'Sul SP', segmento: 'corte', nota: 91, ultimaVisita: '2025-05-14', animais: 520 },
]

const MEDIAS_REGIONAIS = {
  'Sudoeste SP': 71,
  'Norte SP':    81,
  'Leste SP':    57,
  'Sul SP':      73,
}

const MEDIA_NACIONAL = 68

function notaCor(nota) {
  if (nota >= 80) return { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' }
  if (nota >= 60) return { bg: '#fff8e1', text: '#f57f17', border: '#ffe082' }
  return { bg: '#ffebee', text: '#c62828', border: '#ef9a9a' }
}

function notaLabel(nota) {
  if (nota >= 80) return 'Ótimo'
  if (nota >= 60) return 'Regular'
  return 'Atenção'
}

function segmentoLabel(s) {
  if (s === 'leite') return 'Leite'
  if (s === 'corte') return 'Corte'
  return 'Suínos'
}

function segmentoCor(s) {
  if (s === 'leite') return { bg: '#e3f2fd', text: '#1565c0' }
  if (s === 'corte') return { bg: '#fce4ec', text: '#880e4f' }
  return { bg: '#f3e5f5', text: '#6a1b9a' }
}

export default function Dados() {
  const navigate = useNavigate()
  const [regiaoSel, setRegiaoSel] = useState('Todas')
  const [segSel, setSegSel] = useState('Todos')
  const [busca, setBusca] = useState('')

  const regioes = ['Todas', ...Array.from(new Set(FAZENDAS.map(f => f.regiao)))]

  const filtradas = FAZENDAS.filter(f => {
    if (regiaoSel !== 'Todas' && f.regiao !== regiaoSel) return false
    if (segSel !== 'Todos' && f.segmento !== segSel) return false
    if (busca && !f.nome.toLowerCase().includes(busca.toLowerCase()) && !f.responsavel.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const mediaFiltradas = filtradas.length
    ? Math.round(filtradas.reduce((a, f) => a + f.nota, 0) / filtradas.length)
    : 0

  const otimas  = filtradas.filter(f => f.nota >= 80).length
  const regulares = filtradas.filter(f => f.nota >= 60 && f.nota < 80).length
  const atencao = filtradas.filter(f => f.nota < 60).length

  const regioesDash = Array.from(new Set(filtradas.map(f => f.regiao))).map(r => {
    const fs = filtradas.filter(f => f.regiao === r)
    return { regiao: r, media: Math.round(fs.reduce((a, f) => a + f.nota, 0) / fs.length), total: fs.length }
  })

  return (
    <div style={{ padding: '0 0 80px', background: 'var(--bg, #f5f5f5)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#1b5e20', padding: '16px 16px 12px', color: '#fff' }}>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1 }}>Nutrialle</p>
        <h1 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 600 }}>Dados das Fazendas</h1>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #e0e0e0' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 }}>Média geral</p>
            <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color: '#1b5e20' }}>{mediaFiltradas}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#9e9e9e' }}>Nacional: {MEDIA_NACIONAL}</p>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #e0e0e0' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 }}>Fazendas</p>
            <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color: '#1b5e20' }}>{filtradas.length}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#9e9e9e' }}>filtradas</p>
          </div>
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: `${otimas} Ótimas`, bg: '#e8f5e9', text: '#2e7d32' },
            { label: `${regulares} Regulares`, bg: '#fff8e1', text: '#f57f17' },
            { label: `${atencao} Atenção`, bg: '#ffebee', text: '#c62828' },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, color: c.text, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500 }}>
              {c.label}
            </div>
          ))}
        </div>

        {/* Médias por região */}
        {regioesDash.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #e0e0e0', marginBottom: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#424242', textTransform: 'uppercase', letterSpacing: 0.5 }}>Média por região</p>
            {regioesDash.map(r => {
              const cor = notaCor(r.media)
              const pct = r.media
              return (
                <div key={r.regiao} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#424242' }}>{r.regiao}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: cor.text }}>{r.media} <span style={{ fontSize: 11, fontWeight: 400, color: '#9e9e9e' }}>({r.total} fazendas)</span></span>
                  </div>
                  <div style={{ background: '#f5f5f5', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: cor.text, borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Filtros */}
        <div style={{ marginBottom: 12 }}>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar fazenda ou responsável..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '0.5px solid #e0e0e0', fontSize: 14, background: '#fff', boxSizing: 'border-box', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {regioes.map(r => (
              <button key={r} onClick={() => setRegiaoSel(r)} style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: regiaoSel === r ? '#1b5e20' : '#fff',
                color: regiaoSel === r ? '#fff' : '#424242',
                border: `0.5px solid ${regiaoSel === r ? '#1b5e20' : '#e0e0e0'}`,
              }}>{r}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {['Todos', 'leite', 'corte', 'suinos'].map(s => (
              <button key={s} onClick={() => setSegSel(s)} style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: segSel === s ? '#1b5e20' : '#fff',
                color: segSel === s ? '#fff' : '#424242',
                border: `0.5px solid ${segSel === s ? '#1b5e20' : '#e0e0e0'}`,
              }}>{s === 'suinos' ? 'Suínos' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
        </div>

        {/* Lista de fazendas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map(f => {
            const nc = notaCor(f.nota)
            const sc = segmentoCor(f.segmento)
            const mediaReg = MEDIAS_REGIONAIS[f.regiao] || MEDIA_NACIONAL
            const diffReg = f.nota - mediaReg
            const diffNac = f.nota - MEDIA_NACIONAL
            return (
              <div
                key={f.id}
                onClick={() => navigate(`/fazenda-dados/${f.id}`)}
                style={{ background: '#fff', borderRadius: 12, padding: '14px', border: '0.5px solid #e0e0e0', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#212121' }}>{f.nome}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#757575' }}>{f.responsavel} · {f.animais} animais</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9e9e9e' }}>{f.regiao} · Visita: {new Date(f.ultimaVisita).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div style={{ textAlign: 'center', marginLeft: 12 }}>
                    <div style={{ background: nc.bg, color: nc.text, border: `1px solid ${nc.border}`, borderRadius: 10, padding: '6px 12px', minWidth: 52 }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{f.nota}</p>
                      <p style={{ margin: 0, fontSize: 10 }}>{notaLabel(f.nota)}</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                  <span style={{ background: sc.bg, color: sc.text, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>{segmentoLabel(f.segmento)}</span>
                  <span style={{ fontSize: 11, color: diffReg >= 0 ? '#2e7d32' : '#c62828' }}>
                    {diffReg >= 0 ? '▲' : '▼'} {Math.abs(diffReg)} vs região
                  </span>
                  <span style={{ fontSize: 11, color: diffNac >= 0 ? '#2e7d32' : '#c62828' }}>
                    {diffNac >= 0 ? '▲' : '▼'} {Math.abs(diffNac)} vs nacional
                  </span>
                </div>
              </div>
            )
          })}
          {filtradas.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9e9e9e', fontSize: 14 }}>
              Nenhuma fazenda encontrada
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
