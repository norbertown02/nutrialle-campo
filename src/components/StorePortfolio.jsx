import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowRight, IconBuildingStore, IconCalendarPlus, IconCheck,
  IconClipboardCheck, IconHierarchy2, IconLink, IconMapPin, IconPlus,
  IconRoute, IconUsers, IconX,
} from '@tabler/icons-react'
import '../styles/lojas-carteira.css'

function dateLabel(value) {
  if (!value) return ''
  const iso = String(value).slice(0, 10)
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d, 12).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function StorePortfolio({ store, farms, visits, checklists, appointments, updateFarm }) {
  const navigate = useNavigate()
  const [showLink, setShowLink] = useState(false)
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const children = useMemo(
    () => farms.filter(f => f.parentStoreId === store.id && f.segment !== 'loja')
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR')),
    [farms, store.id]
  )
  const childIds = useMemo(() => new Set(children.map(f => f.id)), [children])
  const childrenVisits = visits.filter(v => childIds.has(v.farmId))
  const childrenChecklists = checklists.filter(c => childIds.has(c.farmId))
  const available = farms.filter(f =>
    f.id !== store.id && f.segment !== 'loja' && !f.parentStoreId &&
    (store.sellerId == null || f.sellerId === store.sellerId)
  ).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))

  const linked = async () => {
    if (!selected || saving) return
    setSaving(true)
    setMessage('')
    try {
      const farm = available.find(f => f.id === selected)
      if (!farm) throw new Error('Selecione uma fazenda disponível.')
      await updateFarm(farm.id, { parentStoreId: store.id })
      setMessage('Fazenda vinculada à loja. Caso esteja offline, a alteração será sincronizada.')
      setSelected('')
      setShowLink(false)
    } catch (error) {
      setMessage(error?.message || 'Não foi possível vincular esta fazenda.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="store-portfolio" aria-label={'Fazendas assistidas pela loja ' + store.name}>
      <div className="store-portfolio__hero">
        <div className="store-portfolio__eyebrow"><IconHierarchy2 size={15} /> CARTEIRA TÉCNICA DA LOJA</div>
        <div className="store-portfolio__topline">
          <div><strong>Fazendas assistidas</strong><p>Propriedades atendidas por meio desta loja</p></div>
          <div className="store-portfolio__metric">{children.length}<small>fazendas</small></div>
        </div>
        <div className="store-portfolio__stats">
          <span><IconRoute size={15} /><strong>{childrenVisits.length}</strong> visitas registradas</span>
          <span><IconClipboardCheck size={15} /><strong>{childrenChecklists.length}</strong> checklists</span>
        </div>
      </div>

      <div className="store-portfolio__body">
        <div className="store-portfolio__actions">
          <button type="button" onClick={() => navigate('/clientes/novo?loja=' + encodeURIComponent(store.id))}>
            <IconPlus size={17} /> Nova fazenda
          </button>
          <button type="button" className="store-portfolio__secondary" aria-expanded={showLink}
            onClick={() => { setShowLink(v => !v); setMessage('') }}>
            <IconLink size={16} /> Vincular existente
          </button>
        </div>

        {showLink && (
          <div className="store-portfolio__link">
            <div className="store-portfolio__linkhead">
              <strong>Vincular uma fazenda já cadastrada</strong>
              <button type="button" onClick={() => setShowLink(false)} aria-label="Fechar"><IconX size={15} /></button>
            </div>
            <p>O vínculo organiza o suporte técnico. Se a fazenda já compra diretamente, sua situação comercial e vínculo com o Ultra não serão alterados.</p>
            {available.length ? (
              <>
                <select aria-label="Selecionar fazenda existente" value={selected} onChange={e => setSelected(e.target.value)}>
                  <option value="">Selecione a fazenda...</option>
                  {available.map(f => <option key={f.id} value={f.id}>{f.name}{f.city ? ' · ' + f.city : ''}</option>)}
                </select>
                <button type="button" className="store-portfolio__confirm" disabled={!selected || saving} onClick={linked}>
                  <IconCheck size={15} /> {saving ? 'Vinculando...' : 'Confirmar vínculo'}
                </button>
              </>
            ) : <p>Nenhuma fazenda sem loja vinculada disponível nesta carteira.</p>}
          </div>
        )}
        {message && <div role="status" className="store-portfolio__message">{message}</div>}

        {children.length === 0 ? (
          <div className="store-portfolio__empty">
            <IconUsers size={26} />
            <strong>Nenhuma fazenda vinculada</strong>
            <span>Cadastre as propriedades atendidas por esta loja para acompanhar visitas, agenda e checklists em um só lugar.</span>
          </div>
        ) : (
          <div className="store-portfolio__list">
            {children.map(f => {
              const farmVisits = childrenVisits.filter(v => v.farmId === f.id)
              const last = farmVisits.map(v => v.visitDate).filter(Boolean).sort().at(-1)
              const farmChecklists = childrenChecklists.filter(c => c.farmId === f.id)
              const next = appointments
                .filter(a => a.farmId === f.id && a.status === 'agendado' && a.appointmentDate >= new Date().toLocaleDateString('en-CA'))
                .map(a => a.appointmentDate).sort()[0]
              return (
                <article key={f.id} className="store-portfolio__item">
                  <button type="button" className="store-portfolio__itemhead"
                    onClick={() => navigate('/clientes/' + encodeURIComponent(f.id))}>
                    <span className="store-portfolio__avatar"><IconUsers size={17} /></span>
                    <span className="store-portfolio__identity">
                      <strong>{f.name}</strong>
                      <small><IconMapPin size={12}/>{f.city || 'Cidade não informada'}{f.state ? ' · ' + f.state : ''}</small>
                    </span>
                    <IconArrowRight size={17} className="store-portfolio__arrow" />
                  </button>
                  <div className="store-portfolio__info">
                    <span>{last ? 'Última visita ' + dateLabel(last) : 'Sem visita registrada'}</span>
                    <span>{farmChecklists.length} {farmChecklists.length===1?'checklist':'checklists'}</span>
                    {next && <span className="store-portfolio__next">Agendado {dateLabel(next)}</span>}
                  </div>
                  <div className="store-portfolio__quick">
                    <button type="button" onClick={() => navigate('/visitas/nova?farm=' + encodeURIComponent(f.id))}><IconRoute size={15}/> Visita</button>
                    <button type="button" onClick={() => navigate('/agenda/novo?farm=' + encodeURIComponent(f.id))}><IconCalendarPlus size={15}/> Agendar</button>
                    <button type="button" onClick={() => navigate('/clientes/' + encodeURIComponent(f.id) + '/checklist')}><IconClipboardCheck size={15}/> Checklist</button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
