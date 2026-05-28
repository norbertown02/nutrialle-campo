import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconChartRadar, IconTrendingUp, IconScale } from '@tabler/icons-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend,
} from 'recharts'
import { useFarms } from '../lib/useFarms'
import { useChecklists } from '../lib/useChecklists'
import { CHECKLIST_TEMPLATES } from '../data/checklists'

const TABS = [
  { id: 'resumo',      label: 'Resumo',      Icon: IconChartRadar },
  { id: 'evolucao',    label: 'Evolução',     Icon: IconTrendingUp },
  { id: 'comparativo', label: 'Comparativo',  Icon: IconScale },
]

const MEDIA_NACIONAL_GERAL = 68
const MEDIAS_NACIONAIS = {
  leite:  { ordenha: 62, nutricao: 65, bezerras: 58, reproducao: 70, conforto: 55 },
  corte:  { pasto: 60, suplementacao: 58, sanidade: 72, ganho: 65, manejo: 55 },
  suinos: { sanidade: 70, ambiencia: 65, racao: 68, reproducao: 72, biosseguridade: 60 },
}
const CORES_ETAPAS = ['#F07D1A', '#5B97C8', '#5BAE4A', '#9B7FD4', '#E0A52E']

function notaCor(n)  { return n >= 80 ? 'var(--green)' : n >= 60 ? 'var(--amber)' : 'var(--red)' }
function notaBg(n)   { return n >= 80 ? 'var(--green-bg)' : n >= 60 ? 'var(--amber-bg)' : 'var(--red-bg)' }
function notaLabel(n){ return n >= 80 ? 'Ótimo' : n >= 60 ? 'Regular' : 'Atenção' }

const tooltipStyle = {
  contentStyle: { background: '#1f1f22', border: '1px solid #323236', borderRadius: 10, fontSize: 12, color: '#EDEDEF' },
  labelStyle: { color: '#9B9C9F' },
}

export default function FazendaDados() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const { getFarm, farms } = useFarms()
  const { getChecklistsByFarm, checklists } = useChecklists()
  const [tabAtiva, setTabAtiva] = useState('resumo')

  const fazenda = getFarm(id)
  if (!fazenda) return (
    <div className="content">
      <div className="empty"><p>Fazenda não encontrada.</p></div>
    </div>
  )

  // Checklists em ordem cronológica crescente
  const checks = getChecklistsByFarm(id).slice().reverse()
  const template    = CHECKLIST_TEMPLATES[fazenda.segment] || []
  const ultimoCheck = checks[checks.length - 1] || null
  const notaGeral   = ultimoCheck?.overallScore ?? null
  const stageScores = ultimoCheck?.stageScores ?? {}
  const mediaNac    = MEDIAS_NACIONAIS[fazenda.segment] || {}

  // Média da região
  const outrasChecks = checklists.filter(c => {
    const f = farms.find(x => x.id === c.farmId)
    return f && f.id !== id && f.region === fazenda.region && f.segment === fazenda.segment
  })
  const porFazenda = {}
  outrasChecks.forEach(c => {
    if (!porFazenda[c.farmId] || c.appliedAt > porFazenda[c.farmId].appliedAt) porFazenda[c.farmId] = c
  })
  const ultimasReg = Object.values(porFazenda)
  const mediaRegGeral = ultimasReg.length
    ? Math.round(ultimasReg.reduce((a, c) => a + (c.overallScore || 0), 0) / ultimasReg.length)
    : null
  const mediaRegEtapas = {}
  if (ultimasReg.length) {
    template.forEach(s => {
      const vals = ultimasReg.map(c => c.stageScores?.[s.stage]).filter(v => v != null)
      if (vals.length) mediaRegEtapas[s.stage] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    })
  }

  // Dados radar
  const radarData = template.map(s => {
    const obj = { etapa: s.title.split(' ')[0], Fazenda: stageScores[s.stage] ?? 0, Nacional: mediaNac[s.stage] ?? 0 }
    if (mediaRegGeral !== null) obj['Região'] = mediaRegEtapas[s.stage] ?? 0
    return obj
  })

  // Evolução geral
  const evolGeral = checks.map(c => {
    const obj = { data: new Date(c.appliedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), Fazenda: c.overallScore }
    if (mediaRegGeral !== null) obj['Região'] = mediaRegGeral
    obj['Nacional'] = MEDIA_NACIONAL_GERAL
    return obj
  })

  // Evolução por etapa
  const evolEtapas = checks.map(c => {
    const obj = { data: new Date(c.appliedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
    template.forEach(s => { obj[s.title.split(' ')[0]] = c.stageScores?.[s.stage] ?? null })
    return obj
  })

  // Comparativo barras
  const comparativo = template.map(s => {
    const obj = { etapa: s.title.split(' ')[0], Fazenda: stageScores[s.stage] ?? 0, Nacional: mediaNac[s.stage] ?? 0 }
    if (mediaRegGeral !== null) obj['Região'] = mediaRegEtapas[s.stage] ?? 0
    return obj
  })

  const segLabel = fazenda.segment === 'suinos' ? 'Suínos'
    : fazenda.segment?.charAt(0).toUpperCase() + fazenda.segment?.slice(1)

  return (
    <div className="content">

      {/* Voltar */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--orange)', fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }}
      >
        <IconArrowLeft size={16} /> Voltar
      </button>

      {/* Header fazenda */}
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div className="eyebrow">{fazenda.region || fazenda.city} · {segLabel}</div>
        <h2>{fazenda.name}</h2>
        <p>{fazenda.ownerName} · {fazenda.herdSize || '—'} animais · {checks.length} visita{checks.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Nota geral */}
      {notaGeral !== null ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: notaBg(notaGeral), borderRadius: 14, width: 72, height: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: notaCor(notaGeral), lineHeight: 1 }}>{notaGeral}</span>
              <span style={{ fontSize: 11, color: notaCor(notaGeral), marginTop: 2 }}>{notaLabel(notaGeral)}</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Nota geral · {new Date(ultimoCheck.appliedAt).toLocaleDateString('pt-BR')}
              </div>
              {mediaRegGeral !== null && (
                <div style={{ fontSize: 12, color: notaGeral >= mediaRegGeral ? 'var(--green)' : 'var(--red)', marginBottom: 3 }}>
                  {notaGeral >= mediaRegGeral ? '▲' : '▼'} {Math.abs(notaGeral - mediaRegGeral)} vs região ({mediaRegGeral})
                </div>
              )}
              <div style={{ fontSize: 12, color: notaGeral >= MEDIA_NACIONAL_GERAL ? 'var(--green)' : 'var(--red)' }}>
                {notaGeral >= MEDIA_NACIONAL_GERAL ? '▲' : '▼'} {Math.abs(notaGeral - MEDIA_NACIONAL_GERAL)} vs nacional ({MEDIA_NACIONAL_GERAL})
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 20, textAlign: 'center', color: 'var(--text-faint)', fontSize: 14, marginBottom: 16 }}>
          Nenhum checklist aplicado ainda nesta fazenda.
        </div>
      )}

      {/* Tabs */}
      {checks.length > 0 && (
        <>
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden', marginBottom: 20 }}>
            {TABS.map(({ id: tid, label }) => (
              <button key={tid} onClick={() => setTabAtiva(tid)} style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                background: tabAtiva === tid ? 'var(--orange)' : 'transparent',
                color: tabAtiva === tid ? '#fff' : 'var(--text-dim)',
                transition: 'background 0.2s',
              }}>{label}</button>
            ))}
          </div>

          {/* ── RESUMO ── */}
          {tabAtiva === 'resumo' && (
            <>
              <div className="section-label">Notas por etapa</div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                {template.map((s, i) => {
                  const nota = stageScores[s.stage] ?? null
                  const reg  = mediaRegEtapas[s.stage] ?? null
                  const nac  = mediaNac[s.stage] ?? null
                  return (
                    <div key={s.stage} style={{ padding: '12px 16px', borderBottom: i < template.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{s.title}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: nota != null ? notaCor(nota) : 'var(--text-faint)' }}>{nota ?? '—'}</span>
                      </div>
                      <div style={{ background: 'var(--surface-3)', borderRadius: 4, height: 5, overflow: 'hidden', marginBottom: 5 }}>
                        {nota != null && <div style={{ width: `${nota}%`, height: '100%', background: notaCor(nota), borderRadius: 4 }} />}
                      </div>
                      <div style={{ display: 'flex', gap: 14 }}>
                        {reg != null && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Região: <span style={{ color: 'var(--silver-dim)' }}>{reg}</span></span>}
                        {nac != null && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Nacional: <span style={{ color: 'var(--silver-dim)' }}>{nac}</span></span>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="section-label">Visão radar</div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 0 4px' }}>
                <div style={{ display: 'flex', gap: 14, paddingLeft: 16, marginBottom: 4, flexWrap: 'wrap' }}>
                  {[['var(--orange)', 'Fazenda'], mediaRegGeral !== null && ['var(--blue)', 'Região'], ['var(--text-faint)', 'Nacional']].filter(Boolean).map(([cor, label]) => (
                    <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: cor, display: 'inline-block' }} />{label}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--line)" />
                    <PolarAngleAxis dataKey="etapa" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                    <Radar name="Fazenda" dataKey="Fazenda" stroke="var(--orange)" fill="var(--orange)" fillOpacity={0.2} />
                    {mediaRegGeral !== null && <Radar name="Região" dataKey="Região" stroke="var(--blue)" fill="var(--blue)" fillOpacity={0.1} />}
                    <Radar name="Nacional" dataKey="Nacional" stroke="var(--text-faint)" fill="none" strokeDasharray="4 3" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* ── EVOLUÇÃO ── */}
          {tabAtiva === 'evolucao' && (
            <>
              <div className="section-label">Nota geral — evolução</div>
              {checks.length < 2 ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 20, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
                  Necessário pelo menos 2 visitas para ver a evolução.
                </div>
              ) : (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 8px 8px', marginBottom: 20 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={evolGeral} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
                      <XAxis dataKey="data" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-dim)' }} />
                      <Line type="monotone" dataKey="Fazenda" stroke="var(--orange)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--orange)' }} />
                      {mediaRegGeral !== null && <Line type="monotone" dataKey="Região" stroke="var(--blue)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />}
                      <Line type="monotone" dataKey="Nacional" stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {checks.length >= 2 && (
                <>
                  <div className="section-label">Evolução por etapa</div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 8px 8px' }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={evolEtapas} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
                        <XAxis dataKey="data" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-dim)' }} />
                        {template.map((s, i) => (
                          <Line key={s.stage} type="monotone" dataKey={s.title.split(' ')[0]} stroke={CORES_ETAPAS[i % CORES_ETAPAS.length]} strokeWidth={1.5} dot={{ r: 3 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── COMPARATIVO ── */}
          {tabAtiva === 'comparativo' && (
            <>
              <div className="section-label">Fazenda vs médias — por etapa</div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 8px 8px', marginBottom: 20 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={comparativo} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
                    <XAxis dataKey="etapa" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-dim)' }} />
                    <Bar dataKey="Fazenda" fill="var(--orange)" radius={[3, 3, 0, 0]} />
                    {mediaRegGeral !== null && <Bar dataKey="Região" fill="var(--blue)" radius={[3, 3, 0, 0]} />}
                    <Bar dataKey="Nacional" fill="var(--surface-3)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="section-label">Detalhe por etapa</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {template.map(s => {
                  const nota = stageScores[s.stage] ?? null
                  const reg  = mediaRegEtapas[s.stage] ?? null
                  const nac  = mediaNac[s.stage] ?? null
                  const dReg = nota != null && reg != null ? nota - reg : null
                  const dNac = nota != null && nac != null ? nota - nac : null
                  return (
                    <div key={s.stage} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>{s.title}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: nota != null ? notaCor(nota) : 'var(--text-faint)', marginBottom: 6, lineHeight: 1 }}>
                        {nota ?? '—'}
                      </div>
                      {dReg !== null && (
                        <div style={{ fontSize: 11, color: dReg >= 0 ? 'var(--green)' : 'var(--red)', marginBottom: 2 }}>
                          {dReg >= 0 ? '▲' : '▼'} {Math.abs(dReg)} vs região
                        </div>
                      )}
                      {dNac !== null && (
                        <div style={{ fontSize: 11, color: dNac >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {dNac >= 0 ? '▲' : '▼'} {Math.abs(dNac)} vs nacional
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
