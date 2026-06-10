import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconCheck, IconX, IconClipboardCheck,
  IconChevronDown, IconChevronUp, IconCheckbox, IconSquare
} from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { useChecklists } from '../lib/useChecklists'
import { CHECKLIST_TEMPLATES, calculateStageScore, calculateOverallScore } from '../data/checklists'
import { gerarRelatorioChecklist } from '../lib/gerarRelatorioChecklist'

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-dim)', fontSize: 13, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 4,
  padding: 0, marginBottom: 14, fontFamily: 'inherit'
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function Checklist() {
  const params = useParams()
  const id = params.id
  const navigate = useNavigate()
  const farmsHook = useFarms()
  const getFarm = farmsHook.getFarm
  const updateFarm = farmsHook.updateFarm
  const checklistsHook = useChecklists()
  const addChecklist = checklistsHook.addChecklist
  const getChecklistsByFarm = checklistsHook.getChecklistsByFarm

  const farm = getFarm(id)
  const [answers, setAnswers] = useState({})
  const [expanded, setExpanded] = useState({})
  const [checklistSalvo, setChecklistSalvo] = useState(null)

  if (!farm) {
    return (
      <div className="content">
        <button onClick={() => navigate('/clientes')} style={backBtnStyle}>
          <IconArrowLeft size={16} /> Voltar
        </button>
        <div className="empty" style={{ marginTop: 40 }}>
          <IconClipboardCheck />
          <p>Fazenda nao encontrada</p>
        </div>
      </div>
    )
  }

  const template = CHECKLIST_TEMPLATES[farm.segment] || CHECKLIST_TEMPLATES.leite

  // Verifica se uma pergunta está ativa (dependsOn)
  const isActive = (q) => {
    if (!q.dependsOn) return true
    return answers[q.dependsOn.id] === q.dependsOn.value
  }

  // Perguntas que contam para o progresso: ativas e não opcionais e não texto
  const mustAnswer = (q) => {
    if (q.optional) return false
    if (q.type === 'text') return false
    if (!isActive(q)) return false
    return true
  }

  const totalQuestions = template.reduce((s, sec) => s + sec.questions.filter(mustAnswer).length, 0)

  const isAnswered = (q) => {
    if (!mustAnswer(q)) return true
    const v = answers[q.id]
    if (v === undefined || v === null) return false
    if (q.type === 'number') return v !== '' && !isNaN(parseFloat(v))
    if (q.type === 'multiselect') return Array.isArray(v) && v.length > 0
    return true
  }

  const totalAnswered = template.reduce(
    (s, sec) => s + sec.questions.filter(q => mustAnswer(q) && isAnswered(q)).length, 0
  )
  const progress = totalQuestions ? Math.round((totalAnswered / totalQuestions) * 100) : 0
  const allAnswered = totalAnswered === totalQuestions

  const setAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  const toggleMultiselect = (qId, optIdx, options) => {
    const nenhum = options.findIndex(o => o.label === 'Nenhum')
    setAnswers(prev => {
      const current = Array.isArray(prev[qId]) ? prev[qId] : []
      // Se clicou em "Nenhum", limpa tudo e deixa só "Nenhum"
      if (optIdx === nenhum) {
        return { ...prev, [qId]: current.includes(nenhum) ? [] : [nenhum] }
      }
      // Se clicou em outra opção, remove "Nenhum" se estiver
      let next = current.filter(i => i !== nenhum)
      if (next.includes(optIdx)) {
        next = next.filter(i => i !== optIdx)
      } else {
        next = [...next, optIdx]
      }
      return { ...prev, [qId]: next }
    })
  }

  const toggleSection = (stage) => {
    setExpanded(prev => ({ ...prev, [stage]: !prev[stage] }))
  }

  const sectionAnswered = (sec) => {
    return sec.questions.filter(q => mustAnswer(q) && isAnswered(q)).length
  }

  const sectionTotal = (sec) => {
    return sec.questions.filter(mustAnswer).length
  }

  const handleSave = () => {
    console.log("handleSave chamado, allAnswered:", allAnswered, "total:", totalAnswered, "/", totalQuestions)
    if (!allAnswered) return

    const stageScores = {}
    template.forEach(stage => {
      stageScores[stage.stage] = calculateStageScore(stage, answers)
    })
    const overallScore = calculateOverallScore(template, answers)

    addChecklist({
      farmId: farm.id,
      appliedAt: todayISO(),
      segment: farm.segment,
      stageScores,
      overallScore,
      answers,
    })

    updateFarm(farm.id, { hasChecklist: true, overallScore })
    setChecklistSalvo({ stageScores, overallScore, answers, template })
  }

  async function handleGerarPDF() {
    if (!checklistSalvo) return
    const farmChecklists = getChecklistsByFarm(farm.id)
    await gerarRelatorioChecklist({
      farm,
      checklists: farmChecklists.length > 0 ? farmChecklists : [{
        appliedAt: todayISO(),
        overallScore: checklistSalvo.overallScore,
        stageScores: checklistSalvo.stageScores,
        answers: checklistSalvo.answers,
      }],
      template: checklistSalvo.template,
    })
  }

  return (
    <div className="content">
      <button onClick={() => navigate('/clientes/' + farm.id)} style={backBtnStyle}>
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="page-head">
        <div className="eyebrow">Checklist tecnico</div>
        <h2>{farm.name}</h2>
        <p>Responda as perguntas para gerar a avaliacao da fazenda</p>
      </div>

      <div className="hint" style={{ marginBottom: 14 }}>
        <IconClipboardCheck size={16} />
        <div>
          Perguntas objetivas. A nota de cada etapa e calculada automaticamente
          a partir das respostas.
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        borderRadius: 14, padding: 14, marginBottom: 14
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 8
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Progresso
          </span>
          <span style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 600 }}>
            {totalAnswered} de {totalQuestions}
          </span>
        </div>
        <div style={{
          height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', width: progress + '%',
            background: 'var(--orange)',
            transition: 'width 0.3s'
          }}></div>
        </div>
      </div>

      {/* Etapas */}
      {template.map((sec, secIdx) => {
        const answered = sectionAnswered(sec)
        const total = sectionTotal(sec)
        const isComplete = total > 0 && answered === total
        const isExpanded = expanded[sec.stage] !== false

        return (
          <div
            key={sec.stage}
            className="card"
            style={{ padding: 0, marginBottom: 10, overflow: 'hidden' }}
          >
            <button
              onClick={() => toggleSection(sec.stage)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: 11
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: isComplete ? 'var(--green-bg)' : 'rgba(240,125,26,0.13)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isComplete ? 'var(--green)' : 'var(--orange)',
                fontSize: 14, fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
                flexShrink: 0
              }}>
                {isComplete ? <IconCheck size={18} /> : secIdx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{sec.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                  {total === 0 ? 'Sem perguntas obrigatorias' : `${answered} de ${total} respondidas`}
                </div>
              </div>
              {isExpanded
                ? <IconChevronUp size={18} style={{ color: 'var(--text-faint)' }} />
                : <IconChevronDown size={18} style={{ color: 'var(--text-faint)' }} />
              }
            </button>

            {isExpanded ? (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--line-soft)' }}>
                {sec.questions.map(q => {
                  const active = isActive(q)
                  if (!active) return null

                  return (
                    <div key={q.id} style={{ marginTop: 14 }}>
                      <label style={{
                        display: 'block', fontSize: 13, fontWeight: 500,
                        color: 'var(--text)', marginBottom: 8
                      }}>
                        {q.label}
                        {q.optional && (
                          <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 6, fontWeight: 400 }}>
                            (opcional)
                          </span>
                        )}
                      </label>

                      {/* NUMBER */}
                      {q.type === 'number' ? (
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                            value={answers[q.id] || ''}
                            onChange={e => setAnswer(q.id, e.target.value)}
                          />
                          {q.unit ? (
                            <span style={{
                              position: 'absolute', right: 12, top: 12,
                              color: 'var(--text-faint)', fontSize: 13
                            }}>
                              {q.unit}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {/* TEXT */}
                      {q.type === 'text' ? (
                        <textarea
                          placeholder={q.placeholder || ''}
                          value={answers[q.id] || ''}
                          onChange={e => setAnswer(q.id, e.target.value)}
                          rows={3}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--line)',
                            borderRadius: 9, padding: '10px 12px',
                            fontSize: 13, color: 'var(--text)',
                            fontFamily: 'inherit', resize: 'vertical',
                            outline: 'none',
                          }}
                        />
                      ) : null}

                      {/* SELECT (radio) */}
                      {q.type === 'select' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {q.options.map((o, oi) => {
                            const selected = answers[q.id] === oi
                            return (
                              <div
                                key={oi}
                                onClick={() => setAnswer(q.id, oi)}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: 9,
                                  cursor: 'pointer',
                                  border: '1px solid ' + (selected ? 'var(--orange)' : 'var(--line)'),
                                  background: selected ? 'rgba(240,125,26,0.08)' : 'var(--surface-2)',
                                  fontSize: 13,
                                  color: selected ? 'var(--orange)' : 'var(--text)',
                                  fontWeight: selected ? 600 : 400,
                                  display: 'flex', alignItems: 'center', gap: 9
                                }}
                              >
                                <div style={{
                                  width: 16, height: 16, borderRadius: '50%',
                                  border: '2px solid ' + (selected ? 'var(--orange)' : 'var(--line)'),
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {selected ? (
                                    <div style={{
                                      width: 8, height: 8, borderRadius: '50%',
                                      background: 'var(--orange)'
                                    }}></div>
                                  ) : null}
                                </div>
                                {o.label}
                              </div>
                            )
                          })}
                        </div>
                      ) : null}

                      {/* MULTISELECT (checkbox) */}
                      {q.type === 'multiselect' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 2 }}>
                            Pode selecionar mais de uma opcao
                          </div>
                          {q.options.map((o, oi) => {
                            const current = Array.isArray(answers[q.id]) ? answers[q.id] : []
                            const selected = current.includes(oi)
                            return (
                              <div
                                key={oi}
                                onClick={() => toggleMultiselect(q.id, oi, q.options)}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: 9,
                                  cursor: 'pointer',
                                  border: '1px solid ' + (selected ? 'var(--orange)' : 'var(--line)'),
                                  background: selected ? 'rgba(240,125,26,0.08)' : 'var(--surface-2)',
                                  fontSize: 13,
                                  color: selected ? 'var(--orange)' : 'var(--text)',
                                  fontWeight: selected ? 600 : 400,
                                  display: 'flex', alignItems: 'center', gap: 9
                                }}
                              >
                                {selected
                                  ? <IconCheckbox size={16} style={{ color: "var(--orange)", flexShrink: 0 }} />
                                  : <IconSquare size={16} style={{ color: 'var(--line)', flexShrink: 0 }} />
                                }
                                {o.label}
                              </div>
                            )
                          })}
                        </div>
                      ) : null}

                      {/* BOOLEAN */}
                      {q.type === 'boolean' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setAnswer(q.id, true)}
                            style={{
                              padding: '12px 0',
                              borderRadius: 9,
                              border: '1px solid ' + (answers[q.id] === true ? 'var(--green)' : 'var(--line)'),
                              background: answers[q.id] === true ? 'var(--green-bg)' : 'var(--surface-2)',
                              color: answers[q.id] === true ? 'var(--green)' : 'var(--text-dim)',
                              fontFamily: 'inherit',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}
                          >
                            <IconCheck size={16} /> Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnswer(q.id, false)}
                            style={{
                              padding: '12px 0',
                              borderRadius: 9,
                              border: '1px solid ' + (answers[q.id] === false ? 'var(--red)' : 'var(--line)'),
                              background: answers[q.id] === false ? 'var(--red-bg)' : 'var(--surface-2)',
                              color: answers[q.id] === false ? 'var(--red)' : 'var(--text-dim)',
                              fontFamily: 'inherit',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}
                          >
                            <IconX size={16} /> Nao
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={!allAnswered}
        style={{
          marginTop: 18,
          opacity: allAnswered ? 1 : 0.45,
          cursor: allAnswered ? 'pointer' : 'not-allowed'
        }}
      >
        <IconCheck size={18} />
        {allAnswered
          ? 'Concluir avaliacao'
          : 'Faltam ' + (totalQuestions - totalAnswered) + ' respostas'}
      </button>
    </div>
  )
}
