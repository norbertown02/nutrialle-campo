import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconChevronRight, IconSearch, IconAlertTriangle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useChecklists } from '../lib/useChecklists'

const MEDIA_NACIONAL = 68

function notaCor(n) {
  if (n >= 80) return 'var(--green)'
  if (n >= 60) return 'var(--amber)'
  return 'var(--red)'
}
function notaBg(n) {
  if (n >= 80) return 'var(--green-bg)'
  if (n >= 60) return 'var(--amber-bg)'
  return 'var(--red-bg)'
}
function notaLabel(n) {
  if (n >= 80) return 'Ótimo'
  if (n >= 60) return 'Regular'
  return 'Atenção'
}
function segLabel(s) {
  if (s === 'leite') return 'Leite'
  if (s === 'corte') return 'Corte'
  return 'Suínos'
}

export default function Dados() {
  const navigate = useNavigate()
  const { farms } = useFarms()
  const { checklists } = useChecklists()
  const [regiaoSel, setRegiaoSel] = useState('Todas')
  const [segSel, setSegSel]       = useState('Todos')
  const [busca, setBusca]         = useState('')

  const fazendasComNota = farms
    .filter(f => f.status === 'ativo')
    .map(f => {
      const checks = checklists
        .filter(c => c.farmId === f.id)
        .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
      const ultimo = checks[0] || null
      return {
        ...f,
        nota: ultimo?.overallScore ?? null,
        stageScores: ultimo?.stageScores ?? null,
        ultimoChecklist: ultimo?.appliedAt ?? null,
        totalChecks: checks.length,
      }
    })

  const regioes = ['Todas', ...Array.from(new Set(fazendasComNota.map(f => f.region).filter(Boolean)))]

  const filtradas = fazendasComNota.filter(f => {
    if (regiaoSel !== 'Todas' && f.region !== regiaoSel) return false
    if (segSel !== 'Todos' && f.segment !== segSel) return false
    if (busca) {
      const q = busca.toLowerCase()
      if (!f.name?.toLowerCase().includes(q) && !f.ownerName?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const comNota    = filtradas.filter(f => f.nota !== null)
  const mediaGeral = comNota.length ? Math.round(comNota.reduce((a, f) => a + f.nota, 0) / comNota.length) : null
  const otimas     = comNota.filter(f => f.nota >= 80).length
  const regulares  = comNota.filter(f => f.nota >= 60 && f.nota < 80).length
  const atencao    = comNota.filter(f => f.nota < 60).length
  const semNota    = filtradas.filter(f => f.nota === null).length

  const regioesDash = Array.from(new Set(filtradas.map(f => f.region).filter(Boolean))).map(r => {
    const fs = filtradas.filter(f => f.region === r && f.nota !== null)
    if (!fs.length) return null
    return { regiao: r, media: Math.round(fs.reduce((a, f) => a + f.nota, 0) / fs.length), total: filtradas.filter(f => f.region === r).length }
  }).filter(Boolean)

  return (
    <div className="content">

      {/* Header */}
      <div className="page-head">
        <div className="eyebrow">Diagnóstico</div>
        <h2>Dados das Fazendas</h2>
        <p>{filtradas.length} fazendas · {semNota} sem checklist</p>
      </div>

      {/* Cards de resumo */}
      <div className="stat-grid">
        <div className="stat">
          <div className="label">Média geral</div>
          <div className="value" style={{ color: mediaGeral ? notaCor(mediaGeral) : 'var(--text-dim)' }}>
            {mediaGeral ?? '—'}
          </div>
          <div className="sub">Ref. nacional: {MEDIA_NACIONAL}</div>
        </div>
        <div className="stat">
          <div className="label">Status</div>
          <div className="value orange">{otimas}</div>
          <div className="sub">{regulares} regulares · {atencao} atenção</div>
        </div>
      </div>

      {/* Médias por região */}
      {regioesDash.length > 0 && (
        <>
          <div className="section-label">Média por região</div>
          <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden', marginBottom: 16 }}>
            {regioesDash.map((r, i) => (
              <div key={r.regiao} style={{
                padding: '12px 16px',
                borderBottom: i < regioesDash.length - 1 ? '1px solid var(--line-soft)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{r.regiao}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: notaCor(r.media) }}>
                    {r.media} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-faint)' }}>/ {r.total} faz.</span>
                  </span>
                </div>
                <div style={{ background: 'var(--surface-3)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${r.media}%`, height: '100%', background: notaCor(r.media), borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Filtros */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <IconSearch size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar fazenda ou responsável..."
          style={{
            width: '100%', padding: '10px 12px 10px 34px',
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, color: 'var(--text)', fontSize: 14,
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
        {regioes.map(r => (
          <button key={r} onClick={() => setRegiaoSel(r)} style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            background: regiaoSel === r ? 'var(--orange)' : 'var(--surface-2)',
            color: regiaoSel === r ? '#fff' : 'var(--text-dim)',
            border: `1px solid ${regiaoSel === r ? 'var(--orange)' : 'var(--line)'}`,
          }}>{r}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['Todos', 'leite', 'corte', 'suinos'].map(s => (
          <button key={s} onClick={() => setSegSel(s)} style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            background: segSel === s ? 'var(--orange)' : 'var(--surface-2)',
            color: segSel === s ? '#fff' : 'var(--text-dim)',
            border: `1px solid ${segSel === s ? 'var(--orange)' : 'var(--line)'}`,
          }}>{s === 'suinos' ? 'Suínos' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      {/* Lista */}
      <div className="section-label">Fazendas</div>
      {filtradas.length === 0 && (
        <div className="empty"><p>Nenhuma fazenda encontrada</p></div>
      )}
      {filtradas.map(f => (
        <div
          key={f.id}
          className="row-item"
          onClick={() => navigate(`/fazenda-dados/${f.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Ícone de status */}
            <div style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: f.nota !== null ? notaBg(f.nota) : 'var(--surface-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {f.nota === null
                ? <IconInfoCircle size={18} color="var(--text-faint)" />
                : f.nota >= 80
                  ? <IconCircleCheck size={18} color="var(--green)" />
                  : f.nota >= 60
                    ? <IconInfoCircle size={18} color="var(--amber)" />
                    : <IconAlertTriangle size={18} color="var(--red)" />
              }
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{f.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                {f.ownerName} · {segLabel(f.segment)}
                {f.region ? ` · ${f.region}` : ''}
              </div>
              {f.nota !== null && (
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {f.nota >= MEDIA_NACIONAL
                      ? <span style={{ color: 'var(--green)' }}>▲ {f.nota - MEDIA_NACIONAL} vs nacional</span>
                      : <span style={{ color: 'var(--red)' }}>▼ {MEDIA_NACIONAL - f.nota} vs nacional</span>
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Nota + seta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {f.nota !== null ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: notaCor(f.nota), lineHeight: 1 }}>{f.nota}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{notaLabel(f.nota)}</div>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>sem nota</div>
              )}
              <IconChevronRight size={16} color="var(--text-faint)" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
