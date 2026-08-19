import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconSearch, IconUserPlus, IconMapPin,
  IconUsersGroup, IconCheck, IconClock, IconCloudUpload, IconLoader2
} from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useConfig } from '../lib/useConfig'

const SEGMENT_TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'leite', label: 'Leite' },
  { id: 'corte', label: 'Corte' },
  { id: 'suinos', label: 'Suínos' },
]

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function LoadingClients() {
  return (
    <div style={{ padding: '38px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
      <IconLoader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--orange)', marginBottom: 10 }} />
      <div style={{ fontWeight: 600, fontSize: 14 }}>Carregando clientes...</div>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Buscando sua carteira atualizada</div>
    </div>
  )
}

export default function Clientes() {
  const { farms, loading, refreshing } = useFarms()
  const { SEGMENTS, SEGMENT_COLORS } = useConfig()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('todos')

  let filtered = farms
  if (segment !== 'todos') filtered = filtered.filter(f => f.segment === segment)
  if (search.trim()) {
    const q = search.toLowerCase().trim()
    filtered = filtered.filter(f =>
      (f.name || '').toLowerCase().includes(q) ||
      (f.owner && f.owner.toLowerCase().includes(q)) ||
      (f.city && f.city.toLowerCase().includes(q))
    )
  }

  const isEmpty = !loading && farms.length === 0

  return (
    <div className="content">
      <div className="page-head">
        <div className="eyebrow">Sua carteira</div>
        <h2>Clientes</h2>
        <p>
          {loading
            ? 'Carregando sua carteira...'
            : isEmpty
              ? 'Cadastre seu primeiro cliente para começar'
              : `${farms.length} ${farms.length === 1 ? 'fazenda' : 'fazendas'} em sua carteira${refreshing ? ' · atualizando...' : ''}`}
        </p>
      </div>

      {loading ? (
        <LoadingClients />
      ) : isEmpty ? (
        <div style={{
          background: 'var(--surface)',
          border: '2px dashed var(--line)',
          borderRadius: 16,
          padding: '40px 24px',
          textAlign: 'center',
          marginTop: 8
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(240,125,26,0.13)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--orange)', margin: '0 auto 16px'
          }}>
            <IconUsersGroup size={36} />
          </div>
          <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
            Sua carteira está vazia
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto 20px' }}>
            Comece cadastrando as fazendas que você atende. Cada fazenda fica visível apenas para você.
          </p>
          <button className="btn btn-primary" style={{ maxWidth: 240, margin: '0 auto' }} onClick={() => navigate('/clientes/novo')}>
            <IconUserPlus size={18} /> Cadastrar primeiro cliente
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <IconSearch size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-faint)' }} />
            <input
              placeholder="Buscar fazenda, produtor ou cidade"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', background: 'var(--surface-2)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '12px 12px 12px 36px', color: 'var(--text)',
                fontFamily: 'inherit', fontSize: 14, outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
            {SEGMENT_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setSegment(t.id)}
                style={{
                  padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap',
                  background: segment === t.id ? 'var(--orange)' : 'var(--surface-2)',
                  color: segment === t.id ? '#1a0d00' : 'var(--text-dim)'
                }}
              >{t.label}</button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty"><IconSearch /><p>Nenhuma fazenda encontrada</p></div>
          ) : (
            filtered.map(f => (
              <div key={f.id} className="row-item" onClick={() => navigate(`/clientes/${f.id}`)}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: SEGMENT_COLORS[f.segment] || 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700,
                    fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif", flexShrink: 0
                  }}>{initials(f.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                    {f.owner && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{f.owner}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconMapPin size={11} /> {f.city || 'Cidade não informada'}{f.state ? `, ${f.state}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className="pill pill-silver">{SEGMENTS[f.segment] || f.segment}</span>
                    {f.pending && <span className="pill pill-amber"><IconCloudUpload size={11} /> sincronizando</span>}
                    {f.hasChecklist ? (
                      <span className="pill pill-green"><IconCheck size={11} /> avaliada</span>
                    ) : (
                      <span className="pill pill-amber"><IconClock size={11} /> pendente</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {!loading && !isEmpty && (
        <button className="fab" onClick={() => navigate('/clientes/novo')}><IconUserPlus /></button>
      )}
    </div>
  )
}
