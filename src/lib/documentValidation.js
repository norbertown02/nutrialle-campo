// Validação local: evita enviar documentos com dígitos verificadores incorretos.
export function somenteDigitos(value) {
  return String(value ?? '').replace(/\D/g, '')
}

export function cpfValido(value) {
  const cpf = somenteDigitos(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  for (let position = 9; position <= 10; position++) {
    let sum = 0
    for (let i = 0; i < position; i++) sum += Number(cpf[i]) * (position + 1 - i)
    const remainder = (sum * 10) % 11
    const digit = remainder === 10 ? 0 : remainder
    if (digit !== Number(cpf[position])) return false
  }
  return true
}

export function cnpjValido(value) {
  const cnpj = somenteDigitos(value)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const weights = [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ]
  for (let check = 0; check < 2; check++) {
    const sum = weights[check].reduce((total, weight, i) => total + Number(cnpj[i]) * weight, 0)
    const remainder = sum % 11
    const digit = remainder < 2 ? 0 : 11 - remainder
    if (digit !== Number(cnpj[12 + check])) return false
  }
  return true
}

export function documentoValido(tipo, value) {
  return tipo === 'cnpj' ? cnpjValido(value) : cpfValido(value)
}

export function erroDocumento(tipo, value) {
  const digits = somenteDigitos(value)
  const label = tipo === 'cnpj' ? 'CNPJ' : 'CPF'
  const length = tipo === 'cnpj' ? 14 : 11
  if (!digits) return `Informe o ${label} para sincronizar o cliente com a Ultra.`
  if (digits.length !== length) return `${label} incompleto: informe ${length} dígitos.`
  if (!documentoValido(tipo, digits)) return `${label} inválido: confira os dígitos verificadores antes de salvar.`
  return null
}
