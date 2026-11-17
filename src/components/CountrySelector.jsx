import React from 'react'

export const COUNTRY_OPTIONS = [
  ['BR', 'Brasil'], ['PY', 'Paraguai'], ['AR', 'Argentina'],
  ['UY', 'Uruguai'], ['BO', 'Bolívia'], ['CL', 'Chile'],
  ['PE', 'Peru'], ['CO', 'Colômbia'], ['EC', 'Equador'],
  ['VE', 'Venezuela'], ['MX', 'México'], ['US', 'Estados Unidos'],
  ['CA', 'Canadá'], ['AO', 'Angola'], ['MZ', 'Moçambique'],
  ['ZA', 'África do Sul'], ['PT', 'Portugal'], ['ES', 'Espanha'],
  ['CN', 'China'], ['IN', 'Índia'],
]

export function isBrazilianCountry(code) {
  return !code || String(code).trim().toUpperCase() === 'BR'
}

export function countryName(code) {
  return COUNTRY_OPTIONS.find(([id]) => id === code)?.[1] || code || 'Brasil'
}

export default function CountrySelector({ value = 'BR', onChange }) {
  const code = (value || '').toUpperCase()
  const listed = COUNTRY_OPTIONS.some(([id]) => id === code)
  return (
    <div>
      <select value={listed ? code : 'OTHER'} onChange={e => onChange(e.target.value === 'OTHER' ? '' : e.target.value)}>
        {COUNTRY_OPTIONS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        <option value="OTHER">Outro país</option>
      </select>
      {!listed && (
        <div style={{ marginTop: 8 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
            Código ISO do país (2 letras)
          </label>
          <input value={code} maxLength={2} placeholder="Ex.: DE" autoCapitalize="characters"
            onChange={e => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))} />
        </div>
      )}
    </div>
  )
}
