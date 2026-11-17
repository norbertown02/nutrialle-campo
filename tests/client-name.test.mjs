import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeClientName, normalizeProducerName, normalizeClientPayload } from '../src/lib/clientName.js'

test('nome do cliente fica em maiúsculas, mantendo acentos', () => {
  assert.equal(normalizeClientName('Sítio São Pedro'), 'SÍTIO SÃO PEDRO')
  assert.equal(normalizeClientName('chácara água limpa'), 'CHÁCARA ÁGUA LIMPA')
  assert.equal(normalizeClientName('COOPAP'), 'COOPAP')
})

test('nome do produtor também fica em maiúsculas, mantendo acentos', () => {
  assert.equal(normalizeProducerName('João da Silva'), 'JOÃO DA SILVA')
  assert.equal(normalizeProducerName('Lúcio Bastazini'), 'LÚCIO BASTAZINI')
})

test('normaliza apenas name, owner e owner_name no payload de sincronização', () => {
  const original = {
    id: 'a', name: 'Sítio do Japonês', owner: 'João Silva',
    owner_name: 'Maria da Luz', city: 'Luiziana',
    email: 'cliente@exemplo.com', notes: 'Visita terça-feira',
  }
  const normalized = normalizeClientPayload(original)
  assert.equal(normalized.name, 'SÍTIO DO JAPONÊS')
  assert.equal(normalized.owner, 'JOÃO SILVA')
  assert.equal(normalized.owner_name, 'MARIA DA LUZ')
  assert.equal(normalized.city, original.city)
  assert.equal(normalized.email, original.email)
  assert.equal(normalized.notes, original.notes)
  assert.equal(original.name, 'Sítio do Japonês')
  assert.equal(original.owner, 'João Silva')
})

test('atualização parcial do produtor não altera outros campos nem acrescenta name', () => {
  const partial = normalizeClientPayload({ owner: 'Ana Cláudia', city: 'Toledo' })
  assert.deepEqual(partial, { owner: 'ANA CLÁUDIA', city: 'Toledo' })
  assert.equal(normalizeClientPayload(null), null)
})
