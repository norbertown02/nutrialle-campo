import { useState } from 'react'
import { IconFileText, IconFlask2, IconChevronRight } from '@tabler/icons-react'
import { irParaPlanos } from '../lib/irParaPlanos'

function CardOpcao({ icon, titulo, descricao, onClick, carregando }) {
  return (
    <button
      onClick={onClick}
      disabled={carregando}
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
        cursor: carregando ? 'default' : 'pointer',
        opacity: carregando ? 0.6 : 1,
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

export default function Nutricao() {
  const [carregando, setCarregando] = useState(null)

  async function abrir(modo) {
    setCarregando(modo)
    try {
      await irParaPlanos(modo)
    } catch (e) {
      console.error('Erro ao abrir', modo, e)
      setCarregando(null)
    }
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
          onClick={() => abrir('introducao')}
          carregando={carregando === 'introducao'}
        />

        <CardOpcao
          icon={<IconFlask2 size={22} color="var(--orange)" />}
          titulo="Controle Nutricional"
          descricao="Suas fazendas, lotes e dietas técnicas: exigências nutricionais reais comparadas com a dieta montada pra cada cliente."
          onClick={() => abrir('nutricional')}
          carregando={carregando === 'nutricional'}
        />
      </div>
    </div>
  )
}
