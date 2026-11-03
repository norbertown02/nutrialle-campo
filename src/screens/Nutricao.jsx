import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  const [params] = useSearchParams()
  const linkedFarmId = params.get('farm')
  // null = mostra os dois cards de escolha; 'introducao'/'nutricional' =
  // mostra o Nutrialle Planos dentro de um iframe em tela cheia (mesma
  // origem, appcampo.nutrialle.com.br/planos -- a sessao do Supabase já
  // fica compartilhada sozinha via localStorage, sem precisar de token).
  const [modo, setModo] = useState(() => linkedFarmId ? 'nutricional' : null)
  const [destino, setDestino] = useState({ tela: null, versao: 0 })

  function abrirTela(tela) {
    // Cada clique reabre a tela, inclusive quando o usuário já estava nela.
    // A troca de URL carrega o Formulador autenticado na própria origem do Campo.
    setDestino(atual => ({ tela, versao: atual.versao + 1 }))
  }
  function escolherModo(novoModo) {
    setDestino(atual => ({ tela: null, versao: atual.versao + 1 }))
    setModo(novoModo)
  }

  if (modo) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          background: '#0A0A0A', flexShrink: 0,
        }}>
          <button
            onClick={() => escolherModo(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '6px 4px',
            }}
          >
            <IconArrowLeft size={18} /> Voltar
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', opacity: 0.85 }}>{TITULOS[modo]}</div>
        </div>
        {modo === 'nutricional' && (
          <nav
            aria-label="Ações da biblioteca nutricional"
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px',
              borderBottom: '1px solid #e9e3dd', background: '#fff', flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => abrirTela(null)}
              style={{
                flex: 1, minWidth: 0, border: '1px solid #e5e0db', borderRadius: 9,
                background: !destino.tela ? '#f5f2ef' : '#fff', color: '#302924',
                padding: '10px 5px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              }}
            >Fazendas</button>
            <button
              type="button"
              onClick={() => abrirTela('matrizes')}
              aria-label="Abrir matrizes de alimentos"
              style={{
                flex: 1, minWidth: 0, border: '1px solid #e5e0db', borderRadius: 9,
                background: destino.tela === 'matrizes' ? '#f5f2ef' : '#fff',
                color: '#302924', padding: '10px 5px', fontSize: 11, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >Matrizes</button>
            <button
              type="button"
              onClick={() => abrirTela('nova-matriz')}
              aria-label="Cadastrar nova matriz de alimento"
              style={{
                flex: 1.25, minWidth: 0, border: '1px solid #e8651e', borderRadius: 9,
                background: '#e8651e', color: '#fff', padding: '10px 5px',
                fontSize: 11, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
              }}
            >+ Nova matriz</button>
          </nav>
        )}
        <iframe
          title={TITULOS[modo]}
          src={`/planos?modo=${modo}&embed=1${linkedFarmId && modo === 'nutricional' && !destino.tela ? '&farm_id='+encodeURIComponent(linkedFarmId) : ''}${modo === 'nutricional' && destino.tela ? '&tela='+encodeURIComponent(destino.tela) : ''}&nav=${destino.versao}`}
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
          onClick={() => escolherModo('introducao')}
        />

        <CardOpcao
          icon={<IconFlask2 size={22} color="var(--orange)" />}
          titulo="Controle Nutricional"
          descricao="Suas fazendas, lotes e dietas técnicas: exigências nutricionais reais comparadas com a dieta montada pra cada cliente."
          onClick={() => escolherModo('nutricional')}
        />
      </div>
    </div>
  )
}
