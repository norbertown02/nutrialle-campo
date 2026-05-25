import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconCheck } from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { SEGMENT_OPTIONS, STATES, inferRegion } from '../data/farms'

export default function NovaFazenda() {
  const navigate = useNavigate()
  const { addFarm } = useFarms()

  const [form, setForm] = useState({
    name: '',
    owner: '',
    ownerRole: 'Proprietário',
    phone: '',
    segment: 'leite',
    city: '',
    state: 'PR',
    herdSize: '',
    production: '',
    area: '',
  })

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isValid =
    form.name.trim().length >= 3 &&
    form.owner.trim().length >= 3 &&
    form.city.trim().length >= 2

  const handleSave = () => {
    if (!isValid) return

    addFarm({
      name: form.name.trim(),
      owner: form.owner.trim(),
      ownerRole: form.ownerRole,
      phone: form.phone.trim(),
      segment: form.segment,
      city: form.city.trim(),
      state: form.state,
      region: inferRegion(form.city, form.state),
      herdSize: form.herdSize.trim(),
      production: form.production.trim(),
      area: form.area.trim(),
    })

    navigate('/clientes')
  }

  return (
    <div className="content">
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-dim)', fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 4,
          padding: 0, marginBottom: 14, fontFamily: 'inherit'
        }}
      >
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="page-head">
        <div className="eyebrow">Nova fazenda</div>
        <h2>Cadastrar cliente</h2>
        <p>Preencha os dados básicos. Você pode completar depois.</p>
      </div>

      <div className="section-label">Identificação</div>

      <Field label="Nome da fazenda *">
        <input
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="Ex.: Fazenda Boa Vista"
        />
      </Field>

      <Field label="Nome do produtor *">
        <input
          value={form.owner}
          onChange={e => setField('owner', e.target.value)}
          placeholder="Ex.: João Marquezini"
        />
      </Field>

      <Field label="Cargo / função">
        <select
          value={form.ownerRole}
          onChange={e => setField('ownerRole', e.target.value)}
        >
          <option>Proprietário</option>
          <option>Gerente</option>
          <option>Sócio</option>
          <option>Encarregado</option>
          <option>Familiar</option>
        </select>
      </Field>

      <Field label="Telefone / WhatsApp">
        <input
          value={form.phone}
          onChange={e => setField('phone', e.target.value)}
          placeholder="(45) 99000-0000"
          inputMode="tel"
        />
      </Field>

      <div className="section-label">Segmento e localização</div>

      <Field label="Segmento *">
        <div style={{ display: 'flex', gap: 6 }}>
          {SEGMENT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setField('segment', opt.value)}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: 10,
                border: '1px solid ' + (form.segment === opt.value ? 'var(--orange)' : 'var(--line)'),
                background: form.segment === opt.value ? 'rgba(240,125,26,0.08)' : 'var(--surface-2)',
                color: form.segment === opt.value ? 'var(--orange)' : 'var(--text-dim)',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {opt.label.replace('Bovinos · ', '')}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <Field label="Cidade *">
          <input
            value={form.city}
            onChange={e => setField('city', e.target.value)}
            placeholder="Ex.: Toledo"
          />
        </Field>

        <Field label="UF">
          <select
            value={form.state}
            onChange={e => setField('state', e.target.value)}
          >
            {STATES.map(s => (
              <option key={s.value} value={s.value}>{s.value}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="section-label">Dados da operação</div>

      <Field label="Tamanho do rebanho">
        <input
          value={form.herdSize}
          onChange={e => setField('herdSize', e.target.value)}
          placeholder={
            form.segment === 'leite' ? 'Ex.: 180 vacas em lactação' :
            form.segment === 'corte' ? 'Ex.: 450 cabeças' :
            'Ex.: 320 matrizes'
          }
        />
      </Field>

      <Field label="Produção atual">
        <input
          value={form.production}
          onChange={e => setField('production', e.target.value)}
          placeholder={
            form.segment === 'leite' ? 'Ex.: 4.200 L/dia' :
            form.segment === 'corte' ? 'Ex.: 30 arrobas/cabeça' :
            'Ex.: 28 desmamados/matriz/ano'
          }
        />
      </Field>

      <Field label="Área (hectares)">
        <input
          value={form.area}
          onChange={e => setField('area', e.target.value)}
          placeholder="Ex.: 120 ha"
        />
      </Field>

      <div className="hint" style={{ marginTop: 18 }}>
        Campos com * são obrigatórios. Tudo mais pode ser preenchido depois,
        na ficha do cliente.
      </div>

      <button
        className="btn btn-primary"
        style={{
          marginTop: 18,
          opacity: isValid ? 1 : 0.45,
          cursor: isValid ? 'pointer' : 'not-allowed'
        }}
        disabled={!isValid}
        onClick={handleSave}
      >
        <IconCheck size={18} />
        Cadastrar fazenda
      </button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.3
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}