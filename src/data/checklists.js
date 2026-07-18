// Checklist objetivo: só perguntas fechadas (boolean, select, number) + text e multiselect.
// Cada opção tem peso (0 a 100). A nota da etapa é calculada, não escolhida.
// Norberto: estas perguntas são iniciais. Revisar com técnico antes de produção.

export const CHECKLIST_TEMPLATES = {
  leite: [
    {
      stage: 'ordenha', title: 'Ordenha e qualidade do leite', icon: 'droplet',
      questions: [
        {
          id: 'q0', label: 'Vacas em lactacao (cabecas)', type: 'number', unit: 'cab',
          ranges: [
            { max: 20, score: 50 },
            { max: 50, score: 65 },
            { max: 100, score: 80 },
            { max: 99999, score: 100 },
          ]
        },
        {
          id: 'q_prod_vaca', label: 'Producao media por vaca/dia (litros)', type: 'number', unit: 'L/dia',
          ranges: [
            { max: 15, score: 40 },
            { max: 22, score: 65 },
            { max: 30, score: 85 },
            { max: 99999, score: 100 },
          ]
        },
        {
          id: 'q1', label: 'Tipo de ordenha', type: 'select', baseline: true,
          options: [
            { label: 'Automatica (robotica)', score: 100 },
            { label: 'Mecanica canalizada', score: 90 },
            { label: 'Mecanica balde ao pe', score: 65 },
            { label: 'Manual', score: 30 },
          ]
        },
        { id: 'q2', label: 'Faz pre-dipping antes da ordenha?', type: 'boolean' },
        { id: 'q3', label: 'Faz pos-dipping apos a ordenha?', type: 'boolean' },
        {
          id: 'q4', label: 'Ultima CCS do tanque (mil celulas/mL)', type: 'number', unit: 'mil',
          ranges: [
            { max: 200, score: 100 },
            { max: 400, score: 75 },
            { max: 600, score: 45 },
            { max: 99999, score: 20 },
          ]
        },
        { id: 'q5', label: 'Faz teste de mastite (CMT) periodico?', type: 'boolean' },
        {
          id: 'q_vacas_secas_pct', label: 'Percentual de vacas secas no rebanho (%)', type: 'number', unit: '%',
          ranges: [
            { max: 15, score: 100 },
            { max: 20, score: 85 },
            { max: 30, score: 65 },
            { max: 99, score: 40 },
          ]
        },
        {
          id: 'q_del', label: 'DEL medio do rebanho (dias em lactacao)', type: 'number', unit: 'dias',
          ranges: [
            { max: 120, score: 100 },
            { max: 160, score: 85 },
            { max: 200, score: 65 },
            { max: 99999, score: 40 },
          ]
        },
      ]
    },
    {
      stage: 'nutricao', title: 'Nutricao do rebanho', icon: 'plant-2',
      questions: [
        {
          id: 'q6', label: 'Suplementacao mineral utilizada', type: 'select',
          options: [
            { label: 'Nucleo completo', score: 100 },
            { label: 'Sal mineral simples', score: 60 },
            { label: 'Apenas sal comum', score: 25 },
            { label: 'Nao suplementa', score: 0 },
          ]
        },
        {
          id: 'q_aditivos', label: 'Suplementos aditivos utilizados', type: 'multiselect',
          options: [
            { label: 'Tamponante', score: 25 },
            { label: 'Adsorvente de micotoxinas', score: 25 },
            { label: 'Leveduras', score: 25 },
            { label: 'Nenhum', score: 0 },
          ]
        },
        {
          id: 'q_aditivos_marca', label: 'Marca de aditivo utilizada atualmente', type: 'text',
          placeholder: 'Ex: Mycosorb, Diamond V, ...'
        },
        { id: 'q7', label: 'Tem reserva de volumoso para o ano todo?', type: 'boolean' },
        { id: 'q8', label: 'Usa silagem ou feno?', type: 'boolean' },
        {
          id: 'q9', label: 'Acompanhamento tecnico de dieta?', type: 'select',
          options: [
            { label: 'Nutricionista regular', score: 100 },
            { label: 'Eventual / cooperativa', score: 60 },
            { label: 'Nao tem', score: 20 },
          ]
        },
      ]
    },
    {
      stage: 'sistema', title: 'Sistema de producao', icon: 'home',
      questions: [
        {
          id: 'q_sistema', label: 'Sistema de criacao utilizado', type: 'select', baseline: true,
          options: [
            { label: 'Free stall', score: 100 },
            { label: 'Compost barn', score: 100 },
            { label: 'A pasto', score: 70 },
          ]
        },
        {
          id: 'q_cocho', label: 'Manejo de cocho (limpeza)', type: 'select',
          options: [
            { label: 'Diario', score: 100 },
            { label: 'Semanal', score: 60 },
            { label: 'Nao faz', score: 10 },
          ]
        },
        {
          id: 'q_preparto', label: 'Animais de pre-parto permanecem no galpao ou a pasto?', type: 'select',
          options: [
            { label: 'No galpao (confinados)', score: 100 },
            { label: 'A pasto', score: 50 },
          ]
        },
        {
          id: 'q_dieta_seca', label: 'Faz dieta de periodo de seca e pre-parto?', type: 'boolean'
        },
      ]
    },
    {
      stage: 'bezerras', title: 'Manejo de bezerras', icon: 'baby-carriage',
      questions: [
        {
          id: 'q10', label: 'Quando o colostro e fornecido', type: 'select',
          options: [
            { label: 'Nas primeiras 6 horas', score: 100 },
            { label: 'Entre 6 e 12 horas', score: 60 },
            { label: 'Apos 12 horas', score: 20 },
          ]
        },
        { id: 'q11', label: 'Faz teste de qualidade do colostro?', type: 'boolean' },
        {
          id: 'q12', label: 'Idade media ao primeiro parto (meses)', type: 'number', unit: 'meses',
          ranges: [
            { max: 24, score: 100 },
            { max: 26, score: 80 },
            { max: 28, score: 60 },
            { max: 30, score: 40 },
            { max: 99, score: 20 },
          ]
        },
        {
          id: 'q13', label: 'Tipo de instalacao para bezerras', type: 'select', baseline: true,
          options: [
            { label: 'Bezerreiro individual com casinhas', score: 100 },
            { label: 'Bezerreiro coletivo coberto', score: 70 },
            { label: 'Soltas no pasto', score: 30 },
          ]
        },
      ]
    },
    {
      stage: 'reproducao', title: 'Reproducao', icon: 'heartbeat',
      questions: [
        {
          id: 'q14', label: 'Intervalo entre partos (meses)', type: 'number', unit: 'meses',
          ranges: [
            { max: 13, score: 100 },
            { max: 14, score: 80 },
            { max: 15, score: 60 },
            { max: 16, score: 40 },
            { max: 99, score: 20 },
          ]
        },
        {
          id: 'q15', label: 'Metodo reprodutivo principal', type: 'select',
          options: [
            { label: 'IATF programada', score: 100 },
            { label: 'Inseminacao convencional', score: 75 },
            { label: 'Monta natural com touro', score: 40 },
          ]
        },
        { id: 'q16', label: 'Faz diagnostico de gestacao?', type: 'boolean' },
      ]
    },
    {
      stage: 'conforto', title: 'Conforto e instalacoes', icon: 'armchair',
      questions: [
        { id: 'q17', label: 'Tem sombreamento na sala de espera?', type: 'boolean', baseline: true },
        { id: 'q18', label: 'Tem ventiladores ou aspersores?', type: 'boolean', baseline: true },
        {
          id: 'q19', label: 'Disponibilidade de agua nos piquetes', type: 'select', baseline: true,
          options: [
            { label: 'Bebedouro em todos os piquetes', score: 100 },
            { label: 'Maioria dos piquetes', score: 65 },
            { label: 'Apenas alguns', score: 30 },
          ]
        },
        { id: 'q20', label: 'Faz limpeza de cocho regularmente?', type: 'boolean' },
      ]
    },
    {
      stage: 'obs', title: 'Observacoes gerais', icon: 'notes',
      questions: [
        {
          id: 'q_obs', label: 'Observacoes e anotacoes livres', type: 'text',
          placeholder: 'Anote aqui informacoes relevantes sobre a propriedade...',
          optional: true,
        },
      ]
    },
  ],
  corte: [
    {
      stage: 'pasto', title: 'Pastagem e lotacao', icon: 'plant',
      questions: [
        {
          id: 'q0', label: 'Total de cabecas no rebanho', type: 'number', unit: 'cab',
          ranges: [
            { max: 50, score: 50 },
            { max: 150, score: 65 },
            { max: 300, score: 80 },
            { max: 99999, score: 100 },
          ]
        },
        {
          id: 'q_tipo_pastagem', label: 'Tipo de pastagem utilizada', type: 'text', baseline: true,
          placeholder: 'Ex: Brachiaria brizantha, Mombaça, Tanzânia, Tifton...'
        },
        {
          id: 'q1', label: 'Taxa de lotacao (UA/ha)', type: 'number', unit: 'UA/ha',
          ranges: [
            { max: 0.8, score: 50 },
            { max: 1.5, score: 85 },
            { max: 2.5, score: 100 },
            { max: 3.5, score: 70 },
            { max: 99, score: 40 },
          ]
        },
        { id: 'q2', label: 'Faz manejo rotacionado?', type: 'boolean' },
        {
          id: 'q3', label: 'Estado geral das pastagens', type: 'select',
          options: [
            { label: 'Bem manejadas e adubadas', score: 100 },
            { label: 'Manejo parcial', score: 60 },
            { label: 'Degradadas', score: 25 },
          ]
        },
        { id: 'q4', label: 'Faz analise de solo regularmente?', type: 'boolean' },
      ]
    },
    {
      stage: 'suplementacao', title: 'Suplementacao', icon: 'plant-2',
      questions: [
        {
          id: 'q5', label: 'Estrategia de suplementacao na seca', type: 'select',
          options: [
            { label: 'Proteico-energetico', score: 100 },
            { label: 'Mineral proteinado', score: 75 },
            { label: 'Apenas mineral', score: 45 },
            { label: 'Nao suplementa', score: 0 },
          ]
        },
        { id: 'q6', label: 'Faz confinamento ou semi-confinamento?', type: 'boolean' },
        {
          id: 'q_conf_alimentacao', label: 'No confinamento, o gado consome:', type: 'select',
          dependsOn: { id: 'q6', value: true },
          options: [
            { label: 'Somente racao completa (TMR)', score: 100 },
            { label: 'Suplemento energetico + volumoso', score: 80 },
            { label: 'Volumoso sem suplemento', score: 40 },
          ]
        },
        {
          id: 'q7', label: 'Estrategia nas aguas (verao)', type: 'select',
          options: [
            { label: 'Suplemento mineral proteinado', score: 100 },
            { label: 'Mineral simples', score: 60 },
            { label: 'Nao suplementa', score: 30 },
          ]
        },
      ]
    },
    {
      stage: 'sanidade', title: 'Sanidade do rebanho', icon: 'vaccine',
      questions: [
        { id: 'q9', label: 'Vermifugacao estrategica?', type: 'boolean' },
        {
          id: 'q10', label: 'Controle de ectoparasitas (carrapato, mosca)', type: 'select',
          options: [
            { label: 'Calendario fixo com rotacao de produtos', score: 100 },
            { label: 'Quando aparece infestacao', score: 50 },
            { label: 'Nao faz controle', score: 10 },
          ]
        },
        { id: 'q_vacinas_repro', label: 'Faz manejo de vacinas reprodutivas?', type: 'boolean' },
      ]
    },
    {
      stage: 'ganho', title: 'Ganho de peso', icon: 'trending-up',
      questions: [
        {
          id: 'q11', label: 'GMD - ganho medio diario (kg/dia)', type: 'number', unit: 'kg/dia',
          ranges: [
            { max: 0.4, score: 30 },
            { max: 0.6, score: 55 },
            { max: 0.8, score: 80 },
            { max: 1.2, score: 100 },
            { max: 99, score: 90 },
          ]
        },
        {
          id: 'q12', label: 'Idade de abate (meses)', type: 'number', unit: 'meses',
          ranges: [
            { max: 24, score: 100 },
            { max: 30, score: 80 },
            { max: 36, score: 60 },
            { max: 99, score: 30 },
          ]
        },
      ]
    },
    {
      stage: 'manejo', title: 'Manejo geral', icon: 'clipboard-check',
      questions: [
        { id: 'q13', label: 'Faz pesagem periodica do rebanho?', type: 'boolean' },
        { id: 'q14', label: 'Mantem registros zootecnicos?', type: 'boolean' },
        {
          id: 'q15', label: 'Identificacao individual dos animais?', type: 'select',
          options: [
            { label: 'Brinco numerado em todos', score: 100 },
            { label: 'Apenas reprodutores', score: 50 },
            { label: 'Sem identificacao', score: 10 },
          ]
        },
      ]
    },
  ],
  suinos: [
    {
      stage: 'sanidade', title: 'Sanidade do plantel', icon: 'vaccine',
      questions: [
        {
          id: 'q0', label: 'Total de matrizes no plantel', type: 'number', unit: 'cab',
          ranges: [
            { max: 50, score: 50 },
            { max: 100, score: 65 },
            { max: 200, score: 80 },
            { max: 99999, score: 100 },
          ]
        },
        { id: 'q1', label: 'Calendario de vacinacao em dia?', type: 'boolean' },
        {
          id: 'q2', label: 'Taxa de mortalidade na creche (%)', type: 'number', unit: '%',
          ranges: [
            { max: 2, score: 100 },
            { max: 4, score: 75 },
            { max: 6, score: 50 },
            { max: 99, score: 25 },
          ]
        },
        { id: 'q3', label: 'Faz monitoria sanitaria com veterinario?', type: 'boolean' },
      ]
    },
    {
      stage: 'ambiencia', title: 'Ambiencia e instalacoes', icon: 'temperature',
      questions: [
        {
          id: 'q4', label: 'Controle de temperatura nas baias', type: 'select', baseline: true,
          options: [
            { label: 'Climatizacao completa', score: 100 },
            { label: 'Ventiladores e cortinas', score: 70 },
            { label: 'Apenas ventilacao natural', score: 35 },
          ]
        },
        {
          id: 'q5', label: 'Estado das instalacoes', type: 'select', baseline: true,
          options: [
            { label: 'Modernas e funcionais', score: 100 },
            { label: 'Funcionais mas antigas', score: 65 },
            { label: 'Precisam de reforma', score: 25 },
          ]
        },
        { id: 'q6', label: 'Tem maternidade separada?', type: 'boolean', baseline: true },
      ]
    },
    {
      stage: 'racao', title: 'Nutricao e racao', icon: 'plant-2',
      questions: [
        {
          id: 'q7', label: 'Conversao alimentar (kg racao / kg ganho)', type: 'number', unit: ':1',
          ranges: [
            { max: 2.4, score: 100 },
            { max: 2.8, score: 80 },
            { max: 3.2, score: 55 },
            { max: 99, score: 30 },
          ]
        },
        { id: 'q8', label: 'Usa racao formulada por fase?', type: 'boolean' },
        {
          id: 'q9', label: 'Acompanhamento nutricional', type: 'select',
          options: [
            { label: 'Nutricionista proprio', score: 100 },
            { label: 'Consultoria eventual', score: 65 },
            { label: 'Nao tem', score: 25 },
          ]
        },
      ]
    },
    {
      stage: 'reproducao', title: 'Manejo reprodutivo', icon: 'heartbeat',
      questions: [
        {
          id: 'q10', label: 'Leitoes desmamados por matriz/ano', type: 'number', unit: 'un',
          ranges: [
            { max: 22, score: 40 },
            { max: 25, score: 65 },
            { max: 28, score: 90 },
            { max: 99, score: 100 },
          ]
        },
        { id: 'q11', label: 'Faz controle e deteccao de cio?', type: 'boolean' },
        { id: 'q12', label: 'Usa inseminacao artificial?', type: 'boolean' },
      ]
    },
    {
      stage: 'biosseguridade', title: 'Biosseguridade', icon: 'shield-check',
      questions: [
        { id: 'q13', label: 'Tem barreira sanitaria na entrada?', type: 'boolean', baseline: true },
        { id: 'q14', label: 'Controle de acesso de pessoas/veiculos?', type: 'boolean' },
        { id: 'q15', label: 'Vazio sanitario entre lotes?', type: 'boolean' },
      ]
    },
  ],
}

// Calcula nota de uma etapa baseado nas respostas
export function calculateStageScore(stage, answers) {
  // Perguntas opcionais e de texto não entram na pontuação
  const scorableQuestions = stage.questions.filter(q =>
    q.type !== 'text' && !q.optional
  )
  if (scorableQuestions.length === 0) return 100

  const scores = scorableQuestions.map(q => {
    // Pergunta condicional: se a condição não foi atendida, pula com score neutro
    if (q.dependsOn) {
      const depAnswer = answers[q.dependsOn.id]
      if (depAnswer !== q.dependsOn.value) return null
    }

    const v = answers[q.id]

    if (q.type === 'boolean') return v === true ? 100 : 0

    if (q.type === 'select') {
      const opt = q.options[v]
      return opt ? opt.score : 0
    }

    if (q.type === 'multiselect') {
      if (!Array.isArray(v) || v.length === 0) return 0
      // Se selecionou "Nenhum", score 0
      const nenhum = q.options.findIndex(o => o.label === 'Nenhum')
      if (nenhum !== -1 && v.includes(nenhum)) return 0
      // Soma os scores das opções selecionadas, cap em 100
      const total = v.reduce((acc, idx) => acc + (q.options[idx]?.score || 0), 0)
      return Math.min(total, 100)
    }

    if (q.type === 'number') {
      const num = parseFloat(v)
      if (isNaN(num) || !q.ranges) return 50
      const range = q.ranges.find(r => num <= r.max)
      return range ? range.score : 50
    }

    return 50
  }).filter(s => s !== null)

  if (scores.length === 0) return 100
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export function calculateOverallScore(template, answers) {
  const scores = template.map(stage => calculateStageScore(stage, answers))
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}
