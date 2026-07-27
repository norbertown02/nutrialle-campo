import { useState } from 'react'
import { IconFileText, IconFlask2, IconChevronRight, IconArrowLeft } from '@tabler/icons-react'

function CardOpcao({ icon, titulo, descricao, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 14px',
        borderRadius: 14,
        border: '1px solid var(--line)',
        background: 'var(--surface)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        marginBottom: 12,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: 'var(--orange-soft)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{titulo}</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2, lineHeight: 1.4 }}>{descricao}</div>
      </div>
      <IconChevronRight size={18} color="var(--text-faint)" />
    </button>
  )
}

const TITULOS = {
  introducao: 'Plano de Introdução',
  nutricional: 'Controle Nutricional',
}

export default function Nutricao() {
  // null = mostra os dois cards de escolha; 'introducao'/'nutricional' =
  // mostra o Nutrialle Planos dentro de um iframe em tela cheia (mesma
  // origem, appcampo.nutrialle.com.br/planos -- a sessao do Supabase já
  // fica compartilhada sozinha via localStorage, sem precisar de token).
  const [modo, setModo] = useState(null)

  if (modo) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          background: '#0A0A0A', flexShrink: 0,
        }}>
          <button
            onClick={() => setModo(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '6px 4px',
            }}
          >
            <IconArrowLeft size={18} /> Voltar
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', opacity: 0.85 }}>{TITULOS[modo]}</div>
        </div>
        <iframe
          title={TITULOS[modo]}
          src={`/planos?modo=${modo}&embed=1`}
          style={{ flex: 1, width: '100%', border: 'none' }}
        />
      </div>
    )
  }

  return (
    <div className="screen-content">
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Nutrição</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            Ferramentas técnicas do Nutrialle Planos
          </div>
        </div>

        <CardOpcao
          icon={<IconFileText size={22} color="var(--orange)" />}
          titulo="Plano de Introdução"
          descricao="Proposta comercial pra uma fazenda nova: comparativo de mercado, produtos recomendados e ponto de equilíbrio."
          onClick={() => setModo('introducao')}
        />

        <CardOpcao
          icon={<IconFlask2 size={22} color="var(--orange)" />}
          titulo="Controle Nutricional"
          descricao="Suas fazendas, lotes e dietas técnicas: exigências nutricionais reais comparadas com a dieta montada pra cada cliente."
          onClick={() => setModo('nutricional')}
        />
      </div>
    </div>
  )
}
