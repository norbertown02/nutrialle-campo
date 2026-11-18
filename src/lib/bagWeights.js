// Pesos de sacaria confirmados para a cotação Trading Constrói em 18/11/2026.
// Mantidos como referência até a sincronização com o cadastro mestre.
// Não aplicar 25 kg como padrão a produtos sem confirmação.
const CONFIRMED_BAG_KG = Object.freeze({
  'NUTRICORTE REPROMAX': 25,
  'PROTEIN 30': 25,
  'CONFINA PLUS': 25,
  'NUTRIMIX C/T 3%': 30,
  'NUTRIMIX AVES POSTURA': 20,
  'NUTRIMIX AVES CRESCIMENTO': 20,
  'NUTRIMIX AVES INICIAL': 20,
  'RACAO EQUINOS': 40,
  'NUTRIMIX GAMA L 25%': 25,
  'NUTRIMIX GAMA L 40%': 20,
})

function normalizedName(name) {
  return String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().replace(/\s+/g, ' ').toUpperCase()
}

export function getBagKg(productName, productBagKg, quoteBagKg) {
  const confirmed = CONFIRMED_BAG_KG[normalizedName(productName)]
  if (confirmed) return confirmed
  for (const value of [productBagKg, quoteBagKg]) {
    const kg = Number(value)
    if (Number.isFinite(kg) && kg > 0) return kg
  }
  return null
}
