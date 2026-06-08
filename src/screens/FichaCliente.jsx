import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconPhone, IconBrandWhatsapp, IconMapPin,
  IconEdit, IconTrash, IconClipboardList, IconCalendarPlus,
  IconReceipt, IconUser, IconBuildingWarehouse,
  IconChecklist, IconRoute, IconCash, IconChartBar, IconDownload
} from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useVisits } from '../lib/useVisits'
import { useChecklists } from '../lib/useChecklists'
import { gerarRelatorioChecklist } from '../lib/gerarRelatorioChecklist'
import { CHECKLIST_TEMPLATES } from '../data/checklists'
import { useSales } from '../lib/useSales'
import { useConfig } from '../lib/useConfig'

function initials(name) {
  return (name || '')
    .split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function onlyDigits(s) {
  return (s || '').replace(/\D/g, '')
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

const backBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-dim)',
  fontSize: 13,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: 0,
  marginBottom: 14,
  fontFamily: 'inherit'
}

const actionBtnStyle = {
  padding: '14px 6px',
  flexDirection: 'column',
  gap: 5,
  fontSize: 11
}

function Row(props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '8px 0',
      borderBottom: '1px solid var(--line-soft)'
    }}>
      <div style={{ color: 'var(--text-faint)', flexShrink: 0 }}>{props.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{props.label}</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{props.value}</div>
      </div>
    </div>
  )
}

function EmptyHistory(props) {
  return (
    <div className="empty" style={{ padding: 30 }}>
      {props.icon}
      <p>{props.label}</p>
      <p style={{
        fontSize: 11,
        color: 'var(--text-faint)',
        marginTop: 6,
        maxWidth: 240,
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>{props.hint}</p>
    </div>
  )
}

function VisitCard(props) {
  const v = props.visit
  const o = v.outcome
  const color = o === 'positiva' ? 'var(--green)' : o === 'negativa' ? 'var(--red)' : 'var(--silver-dim)'
  const bg = o === 'positiva' ? 'var(--green-bg)' : o === 'negativa' ? 'var(--red-bg)' : 'var(--surface-2)'
  const label = o === 'positiva' ? 'Positiva' : o === 'negativa' ? 'Negativa' : 'Neutra'

  return (
    <div className="card" style={{ padding: 14, marginBottom: 8 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
      }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{formatDate(v.visitDate)}</span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 9px',
          borderRadius: 20,
          background: bg,
          color: color
        }}>
          {label}
        </span>
      </div>
      {v.notes ? (
        <div style={{
          fontSize: 12,
          color: 'var(--text-dim)',
          lineHeight: 1.45,
          marginTop: 6
        }}>
          {v.notes}
        </div>
      ) : null}
      {v.nextVisitDate ? (
        <div style={{
          fontSize: 11,
          color: 'var(--text-faint)',
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid var(--line-soft)'
        }}>
          Proxima visita: {formatDate(v.nextVisitDate)}
        </div>
      ) : null}
    </div>
  )
}

export default function FichaCliente() {
  const params = useParams()
  const id = params.id
  const navigate = useNavigate()
  const farmsHook = useFarms()
  const getFarm = farmsHook.getFarm
  const removeFarm = farmsHook.removeFarm
  const visitsHook = useVisits()
  const getVisitsByFarm = visitsHook.getVisitsByFarm
  const checklistsHook = useChecklists()
  const getChecklistsByFarm = checklistsHook.getChecklistsByFarm
  const salesHook = useSales()
  const { SEGMENTS, SEGMENT_COLORS } = useConfig()
  const getSalesByFarm = salesHook.getSalesByFarm

  const [tab, setTab] = useState('visitas')
  const [confirmRemove, setConfirmRemove] = useState(false)

  const farm = getFarm(id)
  const farmVisits = farm ? getVisitsByFarm(farm.id) : []
  const farmChecklists = farm ? getChecklistsByFarm(farm.id) : []
  const farmSales = farm ? getSalesByFarm(farm.id) : []

  const [editando, setEditando] = useState(false)
  const [editForm, setEditForm] = useState({})

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

  const handleVisita = () => {
    navigate('/visitas/nova?farm=' + farm.id)
  }

  const handleChecklist = () => {
    navigate('/clientes/' + farm.id + '/checklist')
  }
  

 const handleVenda = () => {
    navigate('/vendas/nova?farm=' + farm.id)
  }

  const handleEditar = () => {
    setEditForm({
      name:         farm.name || '',
      owner:        farm.owner || farm.ownerName || '',
      phone:        farm.phone || '',
      city:         farm.city || '',
      state:        farm.state || '',
      cep:          farm.cep || '',
      street:       farm.street || '',
      streetNumber: farm.streetNumber || '',
      cpfCnpj:      farm.cpfCnpj || '',
      cadPro:       farm.cadPro || '',
      notes:        farm.notes || '',
    })
    setEditando(true)
  }

  async function salvarEdicao() {
    const payload = {
      name:          editForm.name,
      owner:         editForm.owner,
      owner_name:    editForm.owner,
      phone:         editForm.phone,
      city:          editForm.city,
      state:         editForm.state,
      cep:           editForm.cep,
      street:        editForm.street,
      street_number: editForm.streetNumber,
      cpf_cnpj:      editForm.cpfCnpj,
      cad_pro:       editForm.cadPro,
      notes:         editForm.notes,
    }
    const { error } = await supabase.from('farms').update(payload).eq('id', farm.id)
    if (!error) {
      setEditando(false)
      // Atualiza localmente
      Object.assign(farm, editForm)
      window.location.reload()
    } else {
      alert('Erro ao salvar: ' + error.message)
    }
  }

  if (editando) return (
    <div className="content">
      <button onClick={() => setEditando(false)} style={backBtnStyle}>
        <IconArrowLeft size={16} /> Voltar
      </button>
      <div className="page-head">
        <div className="eyebrow">Editar dados</div>
        <h2>{farm.name}</h2>
      </div>

      <div className="section-label">Dados principais</div>
      {[
        {label:'Nome da fazenda', key:'name'},
        {label:'Produtor', key:'owner'},
        {label:'Telefone / WhatsApp', key:'phone'},
      ].map(f => (
        <div key={f.key} style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-dim)',marginBottom:4}}>{f.label}</label>
          <input value={editForm[f.key]||''} onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.value}))} />
        </div>
      ))}

      <div className="section-label">Documentos</div>
      {[
        {label:'CPF / CNPJ', key:'cpfCnpj'},
        {label:'CAD/PRO', key:'cadPro'},
      ].map(f => (
        <div key={f.key} style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-dim)',marginBottom:4}}>{f.label}</label>
          <input value={editForm[f.key]||''} onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.value}))} />
        </div>
      ))}

      <div className="section-label">Endereço</div>
      {[
        {label:'CEP', key:'cep'},
        {label:'Rua / Logradouro', key:'street'},
        {label:'Número', key:'streetNumber'},
        {label:'Cidade', key:'city'},
        {label:'Estado', key:'state'},
      ].map(f => (
        <div key={f.key} style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-dim)',marginBottom:4}}>{f.label}</label>
          <input value={editForm[f.key]||''} onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.value}))} />
        </div>
      ))}

      <div className="section-label">Observações</div>
      <textarea value={editForm.notes||''} onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))}
        style={{width:'100%',minHeight:80,marginBottom:20}} placeholder="Observações sobre o cliente..."/>

      <button className="btn btn-primary" style={{width:'100%'}} onClick={salvarEdicao}>
        Salvar alterações
      </button>
    </div>
  )

  return (
    <div className="content">
      <button onClick={() => navigate('/clientes')} style={backBtnStyle}>
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: segmentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontWeight: 700,
            fontSize: 22,
            fontFamily: "'Barlow Condensed', sans-serif",
            flexShrink: 0
          }}>
            {initials(farm.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 22,
              lineHeight: 1.1
            }}>
              {farm.name}
            </h2>
            <div style={{
              fontSize: 12,
              color: 'var(--text-dim)',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <IconMapPin size={12} /> {farm.city}, {farm.state}
            </div>
            <div style={{
              display: 'flex',
              gap: 6,
              marginTop: 8,
              alignItems: 'center'
            }}>
              <span className="pill pill-silver">{SEGMENTS[farm.segment]}</span>
              {farm.clientCode ? (
                <span style={{
                  fontSize: 10,
                  color: 'var(--text-faint)',
                  letterSpacing: 0.5
                }}>
                  {farm.clientCode}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 8,
            marginTop: 12
          }}>
            <button className="btn btn-ghost" style={actionBtnStyle} onClick={handleChecklist}>
              <IconClipboardList size={22} />
              <span>Checklist</span>
            </button>
            <button className="btn btn-ghost" style={actionBtnStyle} onClick={handleVisita}>
              <IconCalendarPlus size={22} />
              <span>Visita</span>
            </button>
            <button className="btn btn-ghost" style={actionBtnStyle} onClick={() => navigate('/fazenda-dados/' + farm.id)}>
              <IconChartBar size={22} />
              <span>Dados</span>
            </button>
            <button className="btn btn-primary" style={actionBtnStyle} onClick={handleVenda}>
              <IconReceipt size={22} />
              <span>Venda</span>
            </button>
          </div>

      <div className="section-label">Produtor</div>
      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
            {farm.phone ? (
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
                {farm.phone}
              </div>
            ) : null}
          </div>
        </div>
        {farm.phone ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 12
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <IconBrandWhatsapp size={16} /> WhatsApp
            </a>
          </div>
        ) : null}
      </div>

      <div className="section-label">
        Operacao
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--orange)',
            fontSize: 11,
            fontWeight: 600,
            marginLeft: 'auto',
            fontFamily: 'inherit'
          }}
          onClick={handleEditar}
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
        {farm.region ? (
          <Row icon={<IconMapPin size={18} />} label="Regiao"
            value={farm.region} />
        ) : null}
      </div>

      <div className="section-label">Historico</div>

      <div style={{
        display: 'flex',
        gap: 5,
        background: 'var(--surface-2)',
        padding: 4,
        borderRadius: 10,
        marginBottom: 12
      }}>
        <button
          onClick={() => setTab('visitas')}
          style={{
            flex: 1,
            padding: '9px 4px',
            borderRadius: 7,
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            background: tab === 'visitas' ? 'var(--orange)' : 'transparent',
            color: tab === 'visitas' ? '#1a0d00' : 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5
          }}
        >
          <IconRoute size={14} /> Visitas {farmVisits.length > 0 ? '(' + farmVisits.length + ')' : ''}
        </button>
        <button
          onClick={() => setTab('vendas')}
          style={{
            flex: 1,
            padding: '9px 4px',
            borderRadius: 7,
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            background: tab === 'vendas' ? 'var(--orange)' : 'transparent',
            color: tab === 'vendas' ? '#1a0d00' : 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5
          }}
        >
          <IconCash size={14} /> Vendas {farmSales.length > 0 ? '(' + farmSales.length + ')' : ''}
        </button>
        <button
          onClick={() => setTab('checklists')}
          style={{
            flex: 1,
            padding: '9px 4px',
            borderRadius: 7,
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            background: tab === 'checklists' ? 'var(--orange)' : 'transparent',
            color: tab === 'checklists' ? '#1a0d00' : 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5
          }}
        >
          <IconChecklist size={14} /> Checklists {farmChecklists.length > 0 ? '(' + farmChecklists.length + ')' : ''}
        </button>
      </div>

      {tab === 'visitas' && farmVisits.length === 0 ? (
        <EmptyHistory
          icon={<IconRoute />}
          label="Nenhuma visita registrada"
          hint="Toque em Visita acima para registrar a primeira."
        />
      ) : null}

      {tab === 'visitas' && farmVisits.length > 0 ? (
        farmVisits.map(v => <VisitCard key={v.id} visit={v} />)
      ) : null}

      {tab === 'vendas' && farmSales.length === 0 ? (
        <EmptyHistory
          icon={<IconCash />}
          label="Nenhuma venda registrada"
          hint="Toque em Venda acima para registrar a primeira."
        />
      ) : null}

      {tab === 'vendas' && farmSales.length > 0 ? (
        farmSales.map(s => (
          <div key={s.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {formatDate(s.saleDate)}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                background: s.needsApproval ? 'var(--red-bg)' : 'var(--amber-bg)',
                color: s.needsApproval ? 'var(--red)' : 'var(--amber)'
              }}>
                {s.needsApproval ? 'Precisa aprovacao' : 'Pendente envio'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
              {s.items.length} {s.items.length === 1 ? 'item' : 'itens'} · {s.paymentTermLabel}
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 18, color: 'var(--orange)'
            }}>
              R$ {Number(s.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))
      ) : null}

      {tab === 'checklists' && farmChecklists.length === 0 ? (
        <EmptyHistory
          icon={<IconChecklist />}
          label="Nenhum checklist aplicado"
          hint="Toque em Checklist acima para fazer a primeira avaliacao."
        />
      ) : null}

      {tab === 'checklists' && farmChecklists.length > 0 ? (
        <>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}
            onClick={() => gerarRelatorioChecklist({
              farm,
              checklists: farmChecklists,
              template: CHECKLIST_TEMPLATES[farm.segment] || CHECKLIST_TEMPLATES.leite
            })}
          >
            <IconDownload size={15} /> Exportar relatório PDF completo
          </button>
          {farmChecklists.map(c => {
          const color = c.overallScore >= 75 ? 'var(--green)'
            : c.overallScore >= 50 ? 'var(--amber)' : 'var(--red)'
          const bg = c.overallScore >= 75 ? 'var(--green-bg)'
            : c.overallScore >= 50 ? 'var(--amber-bg)' : 'var(--red-bg)'
          return (
            <div key={c.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{formatDate(c.appliedAt)}</span>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontSize: 20, color: color,
                  padding: '2px 12px', borderRadius: 20, background: bg
                }}>
                  {c.overallScore}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(c.stageScores).map(([stage, score]) => (
                  <span key={stage} style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '3px 8px', borderRadius: 12,
                    background: 'var(--surface-2)', color: 'var(--text-dim)'
                  }}>
                    {stage}: {score}
                  </span>
                ))}
              </div>
            </div>
          )
          })
          }
        </>
      ) : null}

      <div style={{
        marginTop: 30,
        paddingTop: 20,
        borderTop: '1px solid var(--line-soft)'
      }}>
        {confirmRemove ? (
          <div className="hint" style={{
            background: 'var(--red-bg)',
            borderColor: 'rgba(217,83,79,0.3)',
            color: 'var(--red)',
            flexDirection: 'column',
            alignItems: 'stretch'
          }}>
            <div>
              <strong>Tem certeza?</strong> Esta acao remove a fazenda da sua carteira.
              Os dados historicos serao perdidos.
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: 10
            }}>
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
                  background: 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
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
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-faint)',
              fontSize: 12,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
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
