import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function scoreCor(n) {
  if (n >= 75) return [47, 158, 68]
  if (n >= 50) return [230, 119, 0]
  return [224, 49, 49]
}

function scoreLabel(n) {
  if (n >= 75) return 'Excelente'
  if (n >= 50) return 'Bom'
  if (n >= 25) return 'Atencao'
  return 'Critico'
}

function recomendacao(score) {
  if (score >= 75) return 'Area bem desenvolvida. Mantenha as boas praticas.'
  if (score >= 50) return 'Bom progresso. Pequenos ajustes podem elevar os resultados.'
  return 'Area prioritaria. Recomendamos acao imediata com suporte tecnico Nutrialle.'
}

export async function gerarRelatorioChecklist({ farm, checklists, template }) {
  const checksOrdenados = [...checklists].sort((a, b) => a.appliedAt.localeCompare(b.appliedAt))
  const ultimo = checksOrdenados[checksOrdenados.length - 1]
  const stageScores = ultimo?.stageScores || {}
  const overallScore = ultimo?.overallScore || 0
  const answers = ultimo?.answers || {}

  const doc    = new jsPDF("p", "mm", "a4")
  const W      = 210
  const margin = 18
  let y        = margin

  const laranja  = [240, 125, 26]
  const cinzaEsc = [40, 40, 40]
  const cinzaMed = [110, 110, 110]
  const cinzaCla = [235, 235, 235]
  const branco   = [255, 255, 255]

  function addPage() { doc.addPage(); y = margin }
  function checkPage(needed = 30) { if (y + needed > 278) addPage() }

  // CABECALHO
  doc.setFillColor(...laranja)
  doc.rect(0, 0, W, 55, "F")

  doc.setFontSize(22)
  doc.setTextColor(...branco)
  doc.setFont("helvetica", "bold")
  doc.text("NUTRIALLE", margin, 20)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text("Relatorio Tecnico de Diagnostico", margin, 30)

  doc.setFontSize(8)
  doc.text("Emitido em " + new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }), margin, 38)
  doc.text("Baseado em " + checklists.length + " avaliacao(oes)", margin, 45)

  doc.setFillColor(...branco)
  doc.circle(W - margin - 18, 30, 18, "F")
  doc.setFontSize(18)
  doc.setTextColor(...scoreCor(overallScore))
  doc.setFont("helvetica", "bold")
  doc.text(String(overallScore), W - margin - 18, 33, { align: "center" })
  doc.setFontSize(7)
  doc.setTextColor(...cinzaMed)
  doc.text("de 100", W - margin - 18, 40, { align: "center" })

  y = 65

  // DADOS DA FAZENDA
  doc.setFontSize(15)
  doc.setTextColor(...cinzaEsc)
  doc.setFont("helvetica", "bold")
  doc.text(farm.name || "Fazenda", margin, y)
  y += 7

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...cinzaMed)
  const segLabel = farm.segment === "leite" ? "Bovinos de Leite" : farm.segment === "corte" ? "Bovinos de Corte" : "Suinos"
  doc.text("Produtor: " + (farm.owner || farm.ownerName || "—") + "   |   Segmento: " + segLabel + "   |   Municipio: " + (farm.city || "—") + "/" + (farm.state || "—"), margin, y)
  y += 10

  doc.setDrawColor(...cinzaCla)
  doc.line(margin, y, W - margin, y)
  y += 8

  // SCORE GERAL
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...cinzaEsc)
  doc.text("Resultado Geral", margin, y)
  y += 6

  doc.setFillColor(...cinzaCla)
  doc.roundedRect(margin, y, W - margin * 2, 10, 2, 2, "F")
  doc.setFillColor(...scoreCor(overallScore))
  doc.roundedRect(margin, y, (W - margin * 2) * (overallScore / 100), 10, 2, 2, "F")
  if (overallScore > 10) {
    doc.setFontSize(8); doc.setTextColor(...branco); doc.setFont("helvetica", "bold")
    doc.text(overallScore + "%", margin + 4, y + 7)
  }
  y += 14

  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...cinzaMed)
  doc.text("Classificacao: " + scoreLabel(overallScore) + "   |   Data: " + (ultimo ? new Date(ultimo.appliedAt + "T12:00:00").toLocaleDateString("pt-BR") : "—"), margin, y)
  y += 10

  // HISTORICO
  if (checksOrdenados.length > 1) {
    checkPage(40)
    doc.setDrawColor(...cinzaCla); doc.line(margin, y, W - margin, y); y += 8
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...cinzaEsc)
    doc.text("Historico de Evolucao", margin, y); y += 6

    autoTable(doc, {
      startY: y,
      head: [["Data", "Score", "Classificacao"]],
      body: checksOrdenados.map(c => [
        new Date(c.appliedAt + "T12:00:00").toLocaleDateString("pt-BR"),
        c.overallScore,
        scoreLabel(c.overallScore)
      ]),
      theme: "striped",
      headStyles: { fillColor: laranja, textColor: branco, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    })
    y = doc.lastAutoTable.finalY + 8

    const primeiro = checksOrdenados[0]
    const variacao = overallScore - primeiro.overallScore
    doc.setFontSize(9); doc.setFont("helvetica", "normal")
    doc.setTextColor(variacao >= 0 ? 47 : 224, variacao >= 0 ? 158 : 49, variacao >= 0 ? 68 : 49)
    doc.text("Evolucao: " + (variacao >= 0 ? "+" : "") + variacao + " pontos desde a primeira avaliacao", margin, y)
    y += 10
  }

  // DIAGNOSTICO POR AREA
  checkPage(20)
  doc.setDrawColor(...cinzaCla); doc.line(margin, y, W - margin, y); y += 8
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...cinzaEsc)
  doc.text("Diagnostico por Area", margin, y); y += 8

  template.forEach(s => {
    checkPage(28)
    const score = stageScores[s.stage] || 0

    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...cinzaEsc)
    doc.text(s.title, margin, y)
    doc.setTextColor(...scoreCor(score))
    doc.text(score + " — " + scoreLabel(score), W - margin, y, { align: "right" })
    y += 5

    doc.setFillColor(...cinzaCla)
    doc.roundedRect(margin, y, W - margin * 2, 7, 1.5, 1.5, "F")
    doc.setFillColor(...scoreCor(score))
    doc.roundedRect(margin, y, (W - margin * 2) * (score / 100), 7, 1.5, 1.5, "F")
    y += 10

    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...cinzaMed)
    doc.text(recomendacao(score), margin, y, { maxWidth: W - margin * 2 })
    y += 8
  })

  // RESPOSTAS
  checkPage(20)
  doc.setDrawColor(...cinzaCla); doc.line(margin, y, W - margin, y); y += 8
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...cinzaEsc)
  doc.text("Detalhamento das Respostas", margin, y); y += 6

  template.forEach(stage => {
    checkPage(30)
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...laranja)
    doc.text(stage.title, margin, y); y += 4

    autoTable(doc, {
      startY: y,
      head: [["Pergunta", "Resposta"]],
      body: stage.questions.map(q => {
        const v = answers[q.id]
        let resposta = "—"
        if (q.type === "boolean") resposta = v === true ? "Sim" : v === false ? "Nao" : "—"
        if (q.type === "select")  resposta = q.options[v]?.label || "—"
        if (q.type === "number")  resposta = v != null ? v + " " + (q.unit || "") : "—"
        return [q.label, resposta]
      }),
      theme: "striped",
      headStyles: { fillColor: [245, 245, 245], textColor: cinzaMed, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 50, halign: "center" } },
      margin: { left: margin, right: margin },
    })
    y = doc.lastAutoTable.finalY + 6
  })

  // RODAPE
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7); doc.setTextColor(...cinzaMed); doc.setFont("helvetica", "normal")
    doc.text("Nutrialle Nutricao Animal — Documento tecnico confidencial", margin, 290)
    doc.text("Pagina " + i + " de " + pages, W - margin, 290, { align: "right" })
    doc.setDrawColor(...cinzaCla); doc.line(margin, 286, W - margin, 286)
  }

  const nomeArq = "Diagnostico_" + (farm.name || "fazenda").replace(/\s+/g, "_") + "_" + new Date().toISOString().slice(0, 10) + ".pdf"
  doc.save(nomeArq)
}
