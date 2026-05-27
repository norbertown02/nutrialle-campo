// Catalogo de produtos. Sera substituido pela integracao com Ultra Sistemas.

export const PRODUCTS = [
  { id: 'pr1', code: 'NL-001', name: 'Nucleo Mineral Premium Leite',
    segment: 'leite', price: 95.00, unit: 'saca 25kg' },
  { id: 'pr2', code: 'NL-002', name: 'Nucleo Bezerras Start',
    segment: 'leite', price: 142.00, unit: 'saca 25kg' },
  { id: 'pr3', code: 'NL-003', name: 'Sal Proteinado Vacas em Lactacao',
    segment: 'leite', price: 78.00, unit: 'saca 30kg' },
  { id: 'pr4', code: 'NC-001', name: 'Suplemento Proteico Corte',
    segment: 'corte', price: 88.00, unit: 'saca 30kg' },
  { id: 'pr5', code: 'NC-002', name: 'Sal Mineral Corte',
    segment: 'corte', price: 72.00, unit: 'saca 30kg' },
  { id: 'pr6', code: 'NS-001', name: 'Premix Suinos Crescimento',
    segment: 'suinos', price: 142.00, unit: 'saca 25kg' },
  { id: 'pr7', code: 'NS-002', name: 'Nucleo Suinos Terminacao',
    segment: 'suinos', price: 155.00, unit: 'saca 25kg' },
  { id: 'pr8', code: 'GE-001', name: 'Promotor de Crescimento (probiotico)',
    segment: 'todos', price: 320.00, unit: 'balde 10kg' },
]

export const PAYMENT_TERMS = [
  { id: 'pt1', label: 'A vista', days: 0 },
  { id: 'pt2', label: '30 dias', days: 30 },
  { id: 'pt3', label: '30/60 dias', days: 45 },
  { id: 'pt4', label: '30/60/90 dias', days: 60 },
  { id: 'pt5', label: '30/60/90/120 dias', days: 75 },
]

export const MAX_DISCOUNT_PERCENT = 10