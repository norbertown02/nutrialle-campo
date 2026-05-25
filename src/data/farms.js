// Constantes compartilhadas relacionadas a fazendas.

export const SEGMENTS = {
  leite: 'Leite',
  corte: 'Corte',
  suinos: 'Suínos',
}

export const SEGMENT_COLORS = {
  leite: '#5B97C8',
  corte: '#F07D1A',
  suinos: '#C77B98',
}

export const SEGMENT_OPTIONS = [
  { value: 'leite', label: 'Bovinos · Leite' },
  { value: 'corte', label: 'Bovinos · Corte' },
  { value: 'suinos', label: 'Suínos' },
]

// Estados brasileiros que a Nutrialle atende
export const STATES = [
  { value: 'PR', label: 'Paraná' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'SP', label: 'São Paulo' },
]

// Inferência simples de região a partir de cidade/estado
export function inferRegion(city, state) {
  const c = (city || '').toLowerCase()
  if (state === 'PR') {
    if (['toledo', 'cascavel', 'marechal cândido rondon', 'marechal candido rondon', 'palotina'].some(x => c.includes(x))) {
      return 'Oeste do PR'
    }
    if (['pato branco', 'francisco beltrão', 'francisco beltrao'].some(x => c.includes(x))) {
      return 'Sudoeste do PR'
    }
    return 'Paraná'
  }
  if (state === 'SC') return 'Santa Catarina'
  if (state === 'MS') return 'Mato Grosso do Sul'
  if (state === 'RS') return 'Rio Grande do Sul'
  if (state === 'SP') return 'São Paulo'
  return 'Outras regiões'
}