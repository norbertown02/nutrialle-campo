import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeClientName, normalizeClientPayload } from '../src/lib/clientName.js'

test('nome do cliente aceita acentos e fica inteiramente em maiúsculas', () => {
  assert.equal(normalizeClientName('Sítio São Pedro'), 'SÍTIO SÃO PEDRO')
  assert.equal(normalizeClientName('chácara água limpa'), 'CHÁCARA ÁGUA LIMPA')
  assert.equal(normalizeClientName('COOPAP'), 'COOPAP')
})

test('somente o campo name é transformado nas sincronizações', () => {
  const original = { id:'a', name:'Sítio do Japonês', owner:'João Silva', city:'Luiziana', email:'cliente@exemplo.com' }
  const normalized = normalizeClientPayload(original)
  assert.equal(normalized.name,'SÍTIO DO JAPONÊS')
  assert.equal(normalized.owner, original.owner)
  assert.equal(normalized.city, original.city)
  assert.equal(normalized.email, original.email)
  assert.equal(original.name, 'Sítio do Japonês')
  assert.equal(normalizeClientPayload({ owner:'Maria Silva' }).name, undefined)
})
