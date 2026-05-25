import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconPhone, IconBrandWhatsapp, IconMapPin,
  IconEdit, IconTrash, IconClipboardList, IconCalendarPlus,
  IconReceipt, IconUser, IconBuildingWarehouse,
  IconChecklist, IconRoute, IconCash
} from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { SEGMENTS, SEGMENT_COLORS } from '../data/farms'

function initials(name) {
  return (name || '')
    .split(' ').filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase()
}

function onlyDigits(s) {
  return (s || '').replace(/\D/g, '')
}

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-dim)', fontSize: 13, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 4,
  padding: 0, marginBottom: 14, fontFamily: 'inherit'
}

const actionBtnStyle = {
  padding: '14px 6px',
  flexDirection: 'column',
  gap: 5,
  fontSize: 11
}

function Row({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      padding: '8px 0',
      borderBottom: '1px solid var(--line-soft)'
    }}>
      <div style={{ color: 'var(--text-faint)', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

function EmptyHistory({ icon, label, hint }) {
  return (
    <div className="empty" style={{ padding: 30 }}>
      {icon}
      <p>{label}</p>
      <p style={{
        fontSize: 11, color: 'var(--text-faint)', marginTop: 6,
        maxWidth: 240, marginLeft: 'auto', marginRight: 'auto'
      }}>{hint}</p>
    </div>
  )
}

export default function FichaCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getFarm, removeFarm } = useFarms()

  const [tab, setTab] = useState('visitas')
  const [confirmRemove, setConfirmRemove] = useState(false)

  const farm = getFarm(id)

  if (!farm) {
    return (
      <div className="content">
        <button onClick={() => navigate('/clientes')} style={backBtnStyle}>
          <IconArrowLeft size={16} /> Voltar
        </button>
        <div className="empty" style={{ marginTop: 40 }}>
          <IconUser />
          <p>Fazenda nao encontrada</p>
        </div>
      </div>
    )
  }

  const segmentColor = SEGMENT_COLORS[farm.segment]

  const handleRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true)
      return
    }
    removeFarm(farm.id)
    navigate('/clientes')
  }

  return (
    <div className="content">
      <button onClick={() => navigate('/clientes')} style={backBtnStyle}>
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: segmentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000', fontWeight: 700, fontSize: 22,
            fontFamily: "'Barlow Condensed', sans-serif",
            flexShrink: 0
          }}>
            {initials(farm.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600, fontSize: 22, lineHeight: 1.1
            }}>
              {farm.name}
            </h2>
            <div style={{
              fontSize: 12, color: 'var(--text-dim)', marginTop: 4,
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              <IconMapPin size={12} /> {farm.city}, {farm.state}
            </div>
            <div style={{
              display: 'flex', gap: 6, marginTop: 8, alignItems: 'center'
            }}>
              <span className="pill pill-silver">{SEGMENTS[farm.segment]}</span>
              {farm.clientCode && (
                <span style={{
                  fontSize: 10, color: 'var(--text-faint)',
                  letterSpacing: 0.5
                }}>
                  {farm.clientCode}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8, marginTop: 12
      }}>
        <button className="btn btn-ghost" style={actionBtnStyle}>
          <IconClipboardList size={22} />
          <span>Checklist</span>
        </button>
        <button className="btn btn-ghost" style={actionBtnStyle}>
          <IconCalendarPlus size={22} />
          <span>Visita</span>
        </button>
        <button className="btn btn-primary" style={actionBtnStyle}>
          <IconReceipt size={22} />
          <span>Venda</span>
        </button>
      </div>

      <div className="section-label">Produtor</div>
      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-dim)'
          }}>
            <IconUser size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {farm.owner || 'Sem nome cadastrado'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {farm.ownerRole || 'Proprietario'}
            </div>
            {farm.phone && (
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
                {farm.phone}
              </div>
            )}
          </div>
        </div>
        {farm.phone && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 8, marginTop: 12
          }}>
            <a
              href={'tel:' + onlyDigits(farm.phone)}
              className="btn btn-ghost"
              style={{ textDecoration: 'none', padding: '10px' }}
            >
              <IconPhone size={16} /> Ligar
            </a>
            <a
              href={'https://wa.me/55' + onlyDigits(farm.phone)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#1e4a2e',
                color: '#5BAE4A',
                textDecoration: 'none',
                borderRadius: 10,
                padding: '10px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <IconBrandWhatsapp size={16} /> WhatsApp
            </a>
          </div>
        )}
      </div>

      <div className="section-label">
        Operacao
        <button
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--orange)', fontSize: 11, fontWeight: 600,
            marginLeft: 'auto', fontFamily: 'inherit'
          }}
          onClick={() => alert('Edicao sera implementada em breve')}
        >
          <IconEdit size={13} style={{ verticalAlign: -2 }} /> editar
        </button>
      </div>
      <div className="card">
        <Row icon={<IconBuildingWarehouse size={18} />} label="Rebanho"
          value={farm.herdSize || 'Nao cadastrado'} />
        <Row icon={<IconRoute size={18} />} label="Producao"
          value={farm.production || 'Nao cadastrada'} />
        <Row icon={<IconMapPin size={18} />} label="Area"
          value={farm.area || 'Nao cadastrada'} />
        {farm.region && (
          <Row icon={<IconMapPin size={18} />} label="Regiao"
            value={farm.region} />
        )}
      </div>

      <div className="section-label">Historico</div>

      <div style={{
        display: 'flex', gap: 5,
        background: 'var(--surface-2)',
        padding: 4, borderRadius: 10, marginBottom: 12
      }}>
        {[
          ['visitas', 'Visitas', IconRoute],
          ['vendas', 'Vendas', IconCash],
          ['checklists', 'Checklists', IconChecklist],
        ].map(([tabId, label, Icon]) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            style={{
              flex: 1, padding: '9px 4px', borderRadius: 7,
              border: 'none', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12, fontWeight: 600,
              letterSpacing: 0.4, textTransform: 'uppercase',
              background: tab === tabId ? 'var(--orange)' : 'transparent',
              color: tab === tabId ? '#1a0d00' : 'var(--text-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'visitas' && (
        <EmptyHistory icon={<IconRoute />} label="Nenhuma visita registrada"
          hint="Toque em Visita acima para registrar a primeira." />
      )}
      {tab === 'vendas' && (
        <EmptyHistory icon={<IconCash />} label="Nenhuma venda registrada"
          hint="Toque em Venda acima para registrar a primeira." />
      )}
      {tab === 'checklists' && (
        <EmptyHistory icon={<IconChecklist />} label="Nenhum checklist aplicado"
          hint="Toque em Checklist acima para fazer a primeira avaliacao." />
      )}

      <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid var(--line-soft)' }}>
        {confirmRemove ? (
          <div className="hint" style={{
            background: 'var(--red-bg)',
            borderColor: 'rgba(217,83,79,0.3)',
            color: 'var(--red)',
            flexDirection: 'column', alignItems: 'stretch'
          }}>
            <div>
              <strong>Tem certeza?</strong> Esta acao remove a fazenda da sua carteira.
              Os dados historicos serao perdidos.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmRemove(false)}
                style={{ padding: '10px' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleRemove}
                style={{
                  background: 'var(--red)', color: '#fff',
                  border: 'none', borderRadius: 10, padding: '10px',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  letterSpacing: 0.6, textTransform: 'uppercase',
                  fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <IconTrash size={16} /> Remover
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleRemove}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-faint)', fontSize: 12, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
              margin: '0 auto'
            }}
          >
            <IconTrash size={14} /> Remover da carteira
          </button>
        )}
      </div>
    </div>
  )
}
