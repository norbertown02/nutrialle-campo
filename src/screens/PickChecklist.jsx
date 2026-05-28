import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconClipboardCheck, IconMapPin } from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { SEGMENTS, SEGMENT_COLORS } from '../data/farms'

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-dim)', fontSize: 13, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 4,
  padding: 0, marginBottom: 14, fontFamily: 'inherit'
}

function initials(name) {
  return (name || '')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase()
}

export default function PickChecklist() {
  const navigate = useNavigate()
  const farmsHook = useFarms()
  const farms = farmsHook.farms

  return (
    <div className="content">
      <button onClick={() => navigate('/')} style={backBtnStyle}>
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="page-head">
        <div className="eyebrow">Checklist tecnico</div>
        <h2>Aplicar checklist</h2>
        <p>Escolha a fazenda para iniciar a avaliacao</p>
      </div>

      {farms.length === 0 ? (
        <div className="empty" style={{ marginTop: 40 }}>
          <IconClipboardCheck />
          <p>Voce ainda nao tem fazendas cadastradas</p>
          <button
            className="btn btn-primary"
            style={{ maxWidth: 240, margin: '20px auto 0' }}
            onClick={() => navigate('/clientes/novo')}
          >
            Cadastrar primeira fazenda
          </button>
        </div>
      ) : (
        farms.map(f => (
          <div
            key={f.id}
            className="row-item"
            onClick={() => navigate('/clientes/' + f.id + '/checklist')}
          >
            <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: SEGMENT_COLORS[f.segment],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontWeight: 700, fontSize: 14,
                fontFamily: "'Barlow Condensed', sans-serif",
                flexShrink: 0
              }}>
                {initials(f.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconMapPin size={11} /> {f.city}, {f.state}
                </div>
              </div>
              <span className="pill pill-silver">{SEGMENTS[f.segment]}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
