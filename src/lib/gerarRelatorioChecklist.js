import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function scoreCor(n) {
  if (n >= 75) return { r: [47,158,68],  hex: '#2f9e44', label: 'Excelente' }
  if (n >= 50) return { r: [230,119,0],  hex: '#e67700', label: 'Bom' }
  if (n >= 25) return { r: [224,49,49],  hex: '#e03131', label: 'Atenção' }
  return               { r: [150,50,50], hex: '#963232', label: 'Crítico' }
}

function recomendacoes(stage, score) {
  const map = {
    ordenha:        { alta: 'Parabéns! A qualidade da ordenha está excelente. Mantenha o protocolo de higiene e o monitoramento de CCS.', media: 'Recomendamos revisar o protocolo de pré e pós-dipping. Uma CCS mais baixa aumenta o preço pago pelo laticínio.', baixa: 'A qualidade do leite está comprometida. Prioridade: implantar protocolo de ordenha higiênica com a Nutrialle.' },
    nutricao:       { alta: 'Nutrição equilibrada. Considere avaliação periódica da dieta para maximizar produção e eficiência.', media: 'Há oportunidade de melhorar a suplementação. O Núcleo Mineral Premium pode elevar a produção significativamente.', baixa: 'A nutrição é o maior limitante da produção. Recomendamos visita técnica urgente para reformulação da dieta.' },
    bezerras:       { alta: 'Excelente manejo de bezerras. A recria bem-feita garante novilhas mais produtivas no futuro.', media: 'Atenção ao colostro e à instalação. O Núcleo Bezerras Start acelera o ganho de peso e reduz mortalidade.', baixa: 'O manejo de bezerras precisa de atenção imediata. Alta mortalidade e recria lenta impactam o rebanho futuro.' },
    reproducao:     { alta: 'Reprodução eficiente. Continue monitorando o intervalo entre partos e a taxa de concepção.', media: 'Revisar o programa reprodutivo. A IATF bem implementada pode reduzir o intervalo entre partos em até 30 dias.', baixa: 'Reprodução comprometida. Recomendamos revisão completa do programa reprodutivo com suporte técnico.' },
    conforto:       { alta: 'Instalações adequadas. O conforto animal impacta diretamente na produção e na saúde do rebanho.', media: 'Melhorias no sombreamento e ventilação podem aumentar a produção em até 15% no verão.', baixa: 'Estresse térmico reduz significativamente a produção. Investimento em conforto tem retorno rápido.' },
    pasto:          { alta: 'Pastagens bem manejadas. Continue com a adubação e o controle de lotação.', media: 'Revisar o manejo rotacionado e a adubação. Pastagens mais produtivas suportam maior lotação.', baixa: 'Pastagens degradadas limitam severamente o potencial do rebanho. Recuperação é prioritária.' },
    suplementacao:  { alta: 'Suplementação estratégica bem implementada. Mantenha o protocolo de sazonalidade.', media: 'Há oportunidade de intensificar a suplementação na seca. O retorno sobre investimento é comprovado.', baixa: 'Suplementação inadequada. A Nutrialle pode montar um protocolo personalizado de suplementação.' },
    sanidade:       { alta: 'Sanidade em dia. O controle preventivo reduz perdas e mantém a produtividade.', media: 'Revisar o calendário sanitário. Algumas lacunas podem gerar perdas significativas.', baixa: 'Sanidade comprometida. Risco de surtos e perdas. Recomendamos intervenção técnica imediata.' },
    ganho:          { alta: 'Excelente ganho de peso. O manejo nutricional está gerando resultado.', media: 'O ganho pode ser melhorado com suplementação proteico-energética estratégica.', baixa: 'Ganho de peso abaixo do potencial. Revisão nutricional urgente pode dobrar o GMD.' },
    manejo:         { alta: 'Gestão da propriedade bem organizada. Os registros permitem tomadas de decisão assertivas.', media: 'Implementar registros zootécnicos melhora o controle e facilita o acesso a crédito rural.', baixa: 'Propriedade sem controle adequado. Registros básicos são o primeiro passo para melhorar.' },
    ambiencia:      { alta: 'Instalações modernas e funcionais. O conforto animal reflete diretamente na produtividade.', media: 'Melhorias no controle térmico podem aumentar a conversão alimentar em até 10%.', baixa: 'Ambiência crítica. Estresse ambiental compromete toda a cadeia produtiva.' },
    racao:          { alta: 'Nutrição de suínos bem estruturada. Mantenha o acompanhamento por fase.', media: 'Revisar a formulação por fase. Ração adequada reduz o ciclo e melhora a conversão.', baixa: 'Nutrição inadequada. Alto custo e baixo desempenho. Reformulação urgente necessária.' },
    biosseguridade: { alta: 'Biosseguridade robusta. Barreira sanitária eficiente protege o plantel.', media: 'Reforçar alguns pontos da barreira sanitária para evitar entrada de doenças.', baixa: 'Biosseguridade frágil. Risco elevado de entrada de doenças no plantel.' },
  }
  const cfg = map[stage] || { alta: 'Boa performance nesta área.', media: 'Há espaço para melhoria.', baixa: 'Atenção necessária nesta área.' }
  if (score >= 70) return cfg.alta
  if (score >= 45) return cfg.media
  return cfg.baixa
}

function produtosSugeridos(stage, score, segment) {
  if (score >= 75) return null
  const map = {
    nutricao:      { leite: 'Núcleo Mineral Premium Leite', corte: 'Suplemento Proteico Corte', suinos: 'Premix Suínos Crescimento' },
    suplementacao: { leite: 'Sal Proteinado Vacas em Lactação', corte: 'Sal Mineral Corte', suinos: 'Núcleo Suínos Terminação' },
    bezerras:      { leite: 'Núcleo Bezerras Start', corte: null, suinos: null },
    racao:         { suinos: 'Premix Suínos Crescimento', leite: null, corte: null },
    sanidade:      { leite: 'Promotor de Crescimento (Probiótico)', corte: 'Promotor de Crescimento (Probiótico)', suinos: 'Promotor de Crescimento (Probiótico)' },
    ganho:         { corte: 'Suplemento Proteico Corte', leite: null, suinos: null },
  }
  return map[stage]?.[segment] || null
}

function gerarRadarSVG(etapas, size = 280) {
  const cx = size/2, cy = size/2, r = size*0.36, n = etapas.length
  const pts = etapas.map((_,i) => { const a=(i*2*Math.PI/n)-Math.PI/2; return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)} })
  const grades = [25,50,75,100].map(pct => { const rr=r*pct/100; const p=etapas.map((_,i)=>{const a=(i*2*Math.PI/n)-Math.PI/2;return `${cx+rr*Math.cos(a)},${cy+rr*Math.sin(a)}`}).join(' '); return `<polygon points="${p}" fill="none" stroke="#e8e8e8" stroke-width="0.8"/>` }).join('')
  const axes = pts.map(p=>`<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#e8e8e8" stroke-width="0.8"/>`).join('')
  const dataPts = etapas.map((e,i)=>{const a=(i*2*Math.PI/n)-Math.PI/2;const rr=r*e.score/100;return `${cx+rr*Math.cos(a)},${cy+rr*Math.sin(a)}`}).join(' ')
  const labels = etapas.map((e,i)=>{const a=(i*2*Math.PI/n)-Math.PI/2;const lr=r*1.22;const lx=cx+lr*Math.cos(a);const ly=cy+lr*Math.sin(a);const anchor=lx<cx-5?'end':lx>cx+5?'start':'middle';const nome=e.nome.split(' ')[0];return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10" fill="#555" font-family="Arial" font-weight="600">${nome}</text>`}).join('')
  const dots = etapas.map((e,i)=>{const a=(i*2*Math.PI/n)-Math.PI/2;const rr=r*e.score/100;return `<circle cx="${cx+rr*Math.cos(a)}" cy="${cy+rr*Math.sin(a)}" r="4.5" fill="${scoreCor(e.score).hex}" stroke="white" stroke-width="2"/>`}).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${grades}${axes}<polygon points="${dataPts}" fill="rgba(240,125,26,0.18)" stroke="#F07D1A" stroke-width="2.5" stroke-linejoin="round"/>${dots}${labels}</svg>`
}

function gerarEvolucaoSVG(checks, w=420, h=130) {
  if(checks.length<2) return null
  const pad={t:18,r:20,b:30,l:38}, iw=w-pad.l-pad.r, ih=h-pad.t-pad.b
  const scores=checks.map(c=>c.overallScore)
  const minS=Math.max(0,Math.min(...scores)-12), maxS=Math.min(100,Math.max(...scores)+12)
  const pts=checks.map((c,i)=>({x:pad.l+(i/(checks.length-1))*iw,y:pad.t+ih-((c.overallScore-minS)/(maxS-minS))*ih,score:c.overallScore,data:c.appliedAt}))
  const linePath=pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath=`${linePath} L ${pts[pts.length-1].x} ${pad.t+ih} L ${pts[0].x} ${pad.t+ih} Z`
  const dots=pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="5.5" fill="${scoreCor(p.score).hex}" stroke="white" stroke-width="2.5"/><text x="${p.x}" y="${p.y-10}" text-anchor="middle" font-size="9" fill="${scoreCor(p.score).hex}" font-weight="bold" font-family="Arial">${p.score}</text>`).join('')
  const xLabels=pts.map(p=>{const d=new Date(p.data+'T12:00:00');return `<text x="${p.x}" y="${pad.t+ih+16}" text-anchor="middle" font-size="8" fill="#aaa" font-family="Arial">${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}</text>`}).join('')
  const grades=[25,50,75,100].map(v=>{if(v<minS||v>maxS) return '';const y=pad.t+ih-((v-minS)/(maxS-minS))*ih;return `<line x1="${pad.l}" y1="${y}" x2="${pad.l+iw}" y2="${y}" stroke="#f2f2f2" stroke-width="1"/><text x="${pad.l-5}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="8" fill="#ccc" font-family="Arial">${v}</text>`}).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${grades}<path d="${areaPath}" fill="rgba(240,125,26,0.08)"/><path d="${linePath}" fill="none" stroke="#F07D1A" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>${dots}${xLabels}</svg>`
}

async function svgToImage(svgString, w, h) {
  return new Promise(resolve => {
    try {
      const blob=new Blob([svgString],{type:'image/svg+xml'}), url=URL.createObjectURL(blob), img=new Image()
      img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=h*2;const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/png'))}
      img.onerror=()=>resolve(null); img.src=url
    } catch { resolve(null) }
  })
}

export async function gerarRelatorioChecklist({ farm, checklists, template }) {
  const checksOrdenados=[...checklists].sort((a,b)=>a.appliedAt.localeCompare(b.appliedAt))
  const ultimo=checksOrdenados[checksOrdenados.length-1]
  const stageScores=ultimo?.stageScores||{}, overallScore=ultimo?.overallScore||0, answers=ultimo?.answers||{}
  const dataUltimo=ultimo?new Date(ultimo.appliedAt+'T12:00:00').toLocaleDateString('pt-BR'):'—'
  const segLabel=farm.segment==='leite'?'Bovinos de Leite':farm.segment==='corte'?'Bovinos de Corte':'Suínos'
  const corScore=scoreCor(overallScore)
  const etapas=template.map(s=>({nome:s.title,stage:s.stage,score:stageScores[s.stage]||0}))

  const [radarImg,evolImg]=await Promise.all([
    svgToImage(gerarRadarSVG(etapas,280),280,280),
    checksOrdenados.length>1?svgToImage(gerarEvolucaoSVG(checksOrdenados,420,130),420,130):Promise.resolve(null)
  ])

  const doc=new jsPDF('p','mm','a4'), W=210, M=16
  let y=0
  const laranja=[240,125,26], cinzaEsc=[35,35,35], cinzaMed=[100,100,100], cinzaCla=[228,228,228], branco=[255,255,255], bgCla=[249,249,249]

  function addPage(){doc.addPage();y=M}
  function checkPage(n=30){if(y+n>282)addPage()}

  // ── CAPA ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...laranja); doc.rect(0,0,W,297,'F')
  doc.setFillColor(200,90,10); doc.rect(0,200,W,97,'F')

  // Círculos decorativos
  ;[[170,40,65],[15,255,90],[200,195,45],[8,75,38],[155,155,28]].forEach(([x,y2,r])=>{
    doc.setGState(new doc.GState({opacity:0.07})); doc.setFillColor(...branco); doc.circle(x,y2,r,'F'); doc.setGState(new doc.GState({opacity:1}))
  })

  // Logo N
  doc.setFillColor(...branco); doc.roundedRect(M,20,44,44,7,7,'F')
  doc.setFontSize(28); doc.setTextColor(...laranja); doc.setFont('helvetica','bold'); doc.text('N',M+22,48,{align:'center'})

  // Nome
  doc.setFontSize(26); doc.setTextColor(...branco); doc.setFont('helvetica','bold'); doc.text('NUTRIALLE',M+52,36)
  doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.text('Nutrição Animal',M+52,46)

  // Linha
  doc.setGState(new doc.GState({opacity:0.35})); doc.setDrawColor(...branco); doc.setLineWidth(0.5); doc.line(M,73,W-M,73); doc.setGState(new doc.GState({opacity:1}))

  // Título
  doc.setFontSize(30); doc.setTextColor(...branco); doc.setFont('helvetica','bold'); doc.text('RELATÓRIO TÉCNICO',M,94)
  doc.setFontSize(18); doc.setFont('helvetica','normal'); doc.text('de Diagnóstico da Propriedade',M,106)

  // Card fazenda
  doc.setGState(new doc.GState({opacity:0.14})); doc.setFillColor(...branco); doc.roundedRect(M,118,W-M*2,58,4,4,'F'); doc.setGState(new doc.GState({opacity:1}))
  doc.setFontSize(17); doc.setTextColor(...branco); doc.setFont('helvetica','bold'); doc.text(farm.name||'Fazenda',M+8,134)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.setGState(new doc.GState({opacity:0.88}))
  doc.text(`Produtor: ${farm.owner||farm.ownerName||'—'}`,M+8,145)
  doc.text(`Segmento: ${segLabel}   |   Município: ${farm.city||'—'}/${farm.state||'—'}`,M+8,154)
  doc.text(`Data da avaliação: ${dataUltimo}   |   Total de avaliações: ${checklists.length}`,M+8,163)
  doc.setGState(new doc.GState({opacity:1}))

  // Score na capa
  doc.setFillColor(...branco); doc.circle(W-M-28,218,28,'F')
  doc.setGState(new doc.GState({opacity:0.15})); doc.setFillColor(...corScore.r); doc.circle(W-M-28,218,35,'F'); doc.setGState(new doc.GState({opacity:1}))
  doc.setFontSize(30); doc.setTextColor(...corScore.r); doc.setFont('helvetica','bold'); doc.text(String(overallScore),W-M-28,222,{align:'center'})
  doc.setFontSize(8); doc.setTextColor(...cinzaMed); doc.text('de 100',W-M-28,232,{align:'center'})

  doc.setFontSize(22); doc.setTextColor(...branco); doc.setFont('helvetica','bold'); doc.text(corScore.label.toUpperCase(),M,214)
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setGState(new doc.GState({opacity:0.8})); doc.text('Classificação geral da propriedade',M,224); doc.setGState(new doc.GState({opacity:1}))

  // Barra score capa
  doc.setGState(new doc.GState({opacity:0.22})); doc.setFillColor(...branco); doc.roundedRect(M,236,W-M*2-68,9,4,4,'F'); doc.setGState(new doc.GState({opacity:1}))
  doc.setFillColor(...corScore.r); doc.roundedRect(M,236,(W-M*2-68)*overallScore/100,9,4,4,'F')

  // Rodapé capa
  doc.setFontSize(7); doc.setTextColor(...branco); doc.setGState(new doc.GState({opacity:0.55}))
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}   |   Nutrialle Nutrição Animal   |   Documento confidencial`,M,288)
  doc.setGState(new doc.GState({opacity:1}))

  // ── PÁG 2: RADAR + EVOLUÇÃO + SCORES ──────────────────────────────────────
  doc.addPage(); y=M

  // Header
  doc.setFillColor(...laranja); doc.rect(0,0,W,13,'F')
  doc.setFontSize(7.5); doc.setTextColor(...branco); doc.setFont('helvetica','bold'); doc.text('NUTRIALLE',M,9)
  doc.setFont('helvetica','normal'); doc.text(`Relatório Técnico — ${farm.name}   |   ${dataUltimo}`,W-M,9,{align:'right'})
  y=22

  doc.setFontSize(14); doc.setTextColor(...cinzaEsc); doc.setFont('helvetica','bold'); doc.text('Visão Geral por Área',M,y); y+=3
  doc.setDrawColor(...laranja); doc.setLineWidth(1.5); doc.line(M,y,M+54,y); y+=7

  if(radarImg) doc.addImage(radarImg,'PNG',M,y,76,76)

  const sideX=M+82; let sy=y
  etapas.forEach(e=>{
    const cor=scoreCor(e.score)
    doc.setFontSize(7.5); doc.setFont('helvetica','bold'); doc.setTextColor(...cinzaEsc)
    doc.text(e.nome.length>24?e.nome.slice(0,22)+'…':e.nome,sideX,sy)
    doc.setFillColor(...cinzaCla); doc.roundedRect(sideX,sy+2,95,5,1.5,1.5,'F')
    doc.setFillColor(...cor.r); doc.roundedRect(sideX,sy+2,95*e.score/100,5,1.5,1.5,'F')
    doc.setFontSize(8.5); doc.setFont('helvetica','bold'); doc.setTextColor(...cor.r); doc.text(String(e.score),sideX+97,sy+6)
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...cinzaMed); doc.text(cor.label,sideX+108,sy+6)
    sy+=13
  })
  y=Math.max(y+80,sy+4)

  if(evolImg&&checksOrdenados.length>1){
    checkPage(52)
    doc.setFontSize(12); doc.setTextColor(...cinzaEsc); doc.setFont('helvetica','bold'); doc.text('Evolução do Score ao Longo do Tempo',M,y); y+=3
    doc.setDrawColor(...laranja); doc.setLineWidth(1.2); doc.line(M,y,M+72,y); y+=5
    doc.addImage(evolImg,'PNG',M,y,120,38)
    const primeiro=checksOrdenados[0], variacao=overallScore-primeiro.overallScore
    const corVar=variacao>=0?[47,158,68]:[224,49,49]
    doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(...corVar)
    doc.text(`${variacao>=0?'▲ +':'▼ '}${variacao} pontos`,W-M,y+12,{align:'right'})
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...cinzaMed)
    doc.text(`desde ${new Date(primeiro.appliedAt+'T12:00:00').toLocaleDateString('pt-BR')}`,W-M,y+20,{align:'right'})
    y+=44
  }

  // ── PÁG 3+: DIAGNÓSTICO POR ÁREA ─────────────────────────────────────────
  checkPage(40)
  doc.setFontSize(14); doc.setTextColor(...cinzaEsc); doc.setFont('helvetica','bold'); doc.text('Diagnóstico Detalhado por Área',M,y); y+=3
  doc.setDrawColor(...laranja); doc.setLineWidth(1.5); doc.line(M,y,M+70,y); y+=8

  template.forEach(stage=>{
    const score=stageScores[stage.stage]||0, cor=scoreCor(score)
    const rec=recomendacoes(stage.stage,score), prod=produtosSugeridos(stage.stage,score,farm.segment)
    const cardH=40+(prod?9:0)
    checkPage(cardH+5)

    doc.setFillColor(...bgCla); doc.roundedRect(M,y,W-M*2,cardH,3,3,'F')
    doc.setDrawColor(...cor.r); doc.setLineWidth(0.4); doc.roundedRect(M,y,W-M*2,cardH,3,3,'S')
    doc.setFillColor(...cor.r); doc.roundedRect(M,y,4,cardH,1.5,1.5,'F')

    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...cinzaEsc); doc.text(stage.title,M+9,y+9)

    doc.setFillColor(...cor.r); doc.roundedRect(W-M-34,y+3,34,12,3,3,'F')
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...branco); doc.text(`${score}  ${cor.label}`,W-M-17,y+11,{align:'center'})

    doc.setFillColor(...cinzaCla); doc.roundedRect(M+9,y+15,W-M*2-47,5,2,2,'F')
    doc.setFillColor(...cor.r); doc.roundedRect(M+9,y+15,(W-M*2-47)*score/100,5,2,2,'F')

    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...cinzaMed)
    const lines=doc.splitTextToSize(rec,W-M*2-16); doc.text(lines,M+9,y+26)

    if(prod){
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(...laranja)
      doc.text(`Nutrialle sugere: ${prod}`,M+9,y+38)
    }
    y+=cardH+5
  })

  // ── RESPOSTAS ─────────────────────────────────────────────────────────────
  checkPage(20)
  doc.setFontSize(13); doc.setTextColor(...cinzaEsc); doc.setFont('helvetica','bold'); doc.text('Detalhamento das Respostas',M,y); y+=3
  doc.setDrawColor(...laranja); doc.setLineWidth(1.2); doc.line(M,y,M+62,y); y+=6

  template.forEach(stage=>{
    checkPage(25)
    doc.setFontSize(9.5); doc.setFont('helvetica','bold'); doc.setTextColor(...laranja); doc.text(stage.title,M,y); y+=4
    autoTable(doc,{
      startY:y,
      head:[['Pergunta','Resposta']],
      body:stage.questions.map(q=>{
        const v=answers[q.id]; let r='—'
        if(q.type==='boolean') r=v===true?'✓ Sim':v===false?'✗ Não':'—'
        if(q.type==='select')  r=q.options[v]?.label||'—'
        if(q.type==='number')  r=v!=null?`${v} ${q.unit||''}`:'—'
        return [q.label,r]
      }),
      theme:'striped',
      headStyles:{fillColor:laranja,textColor:branco,fontSize:8,fontStyle:'bold',cellPadding:3},
      bodyStyles:{fontSize:8,textColor:cinzaEsc,cellPadding:3},
      alternateRowStyles:{fillColor:[252,252,252]},
      columnStyles:{0:{cellWidth:122},1:{cellWidth:50,halign:'center',fontStyle:'bold'}},
      margin:{left:M,right:M},
    })
    y=doc.lastAutoTable.finalY+6
  })

  // ── HISTÓRICO ─────────────────────────────────────────────────────────────
  if(checksOrdenados.length>1){
    checkPage(30)
    doc.setFontSize(13); doc.setTextColor(...cinzaEsc); doc.setFont('helvetica','bold'); doc.text('Histórico de Avaliações',M,y); y+=3
    doc.setDrawColor(...laranja); doc.setLineWidth(1.2); doc.line(M,y,M+50,y); y+=6
    autoTable(doc,{
      startY:y,
      head:[['Data','Score','Classificação',...template.map(s=>s.title.split(' ')[0])]],
      body:checksOrdenados.map(c=>[
        new Date(c.appliedAt+'T12:00:00').toLocaleDateString('pt-BR'),
        {content:c.overallScore,styles:{textColor:scoreCor(c.overallScore).r,fontStyle:'bold',halign:'center'}},
        {content:scoreCor(c.overallScore).label,styles:{textColor:scoreCor(c.overallScore).r}},
        ...template.map(s=>({content:c.stageScores?.[s.stage]||'—',styles:{halign:'center'}}))
      ]),
      theme:'striped',
      headStyles:{fillColor:laranja,textColor:branco,fontSize:8,fontStyle:'bold'},
      bodyStyles:{fontSize:8},
      margin:{left:M,right:M},
    })
    y=doc.lastAutoTable.finalY+8
  }

  // ── RODAPÉ ─────────────────────────────────────────────────────────────────
  const pages=doc.getNumberOfPages()
  for(let i=1;i<=pages;i++){
    doc.setPage(i)
    if(i>1){
      doc.setFillColor(...laranja); doc.rect(0,289,W,8,'F')
      doc.setFontSize(7); doc.setTextColor(...branco); doc.setFont('helvetica','normal')
      doc.text('Nutrialle Nutrição Animal — Documento técnico confidencial',M,294)
      doc.text(`Página ${i} de ${pages}`,W-M,294,{align:'right'})
    }
  }

  doc.save(`Nutrialle_Diagnostico_${(farm.name||'fazenda').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`)
}
