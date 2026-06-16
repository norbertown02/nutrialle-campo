const fs   = require('fs')
const path = require('path')
const proj = process.argv[2] || '.'
const file = path.join(proj, 'src/screens/Checklist.jsx')
let code   = fs.readFileSync(file, 'utf8')

const OLD_HOOK = "  const checklistsHook = useChecklists()\n  const addChecklist = checklistsHook.addChecklist"
const NEW_HOOK = "  const checklistsHook = useChecklists()\n  const addChecklist = checklistsHook.addChecklist\n  const getChecklistsByFarm = checklistsHook.getChecklistsByFarm"

if (code.includes(OLD_HOOK)) { code = code.replace(OLD_HOOK, NEW_HOOK); console.log('✓ hook atualizado') }
else { console.log('⚠ hook nao encontrado') }

const OLD_PDF = "  async function handleGerarPDF() {\n    if (!checklistSalvo) return\n    await gerarRelatorioChecklist({\n      farm,\n      stageScores: checklistSalvo.stageScores,\n      overallScore: checklistSalvo.overallScore,\n      template: checklistSalvo.template,\n      answers: checklistSalvo.answers,\n    })\n  }"
const NEW_PDF = "  async function handleGerarPDF() {\n    if (!checklistSalvo) return\n    const farmChecklists = getChecklistsByFarm(farm.id)\n    await gerarRelatorioChecklist({\n      farm,\n      checklists: farmChecklists.length > 0 ? farmChecklists : [{\n        appliedAt: todayISO(),\n        overallScore: checklistSalvo.overallScore,\n        stageScores: checklistSalvo.stageScores,\n        answers: checklistSalvo.answers,\n      }],\n      template: checklistSalvo.template,\n    })\n  }"

if (code.includes(OLD_PDF)) { code = code.replace(OLD_PDF, NEW_PDF); console.log('✓ handleGerarPDF atualizado') }
else { console.log('⚠ handleGerarPDF nao encontrado') }

fs.writeFileSync(file, code)
