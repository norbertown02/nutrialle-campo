import { useState, useEffect, useCallback } from 'react'
import { db } from './db'
import { enqueue } from './syncEngine'
import { useAuth } from './useAuth.jsx'
import { supabase } from './supabase'

function fromDB(row) {
  if (!row) return null
  return {
    id:           row.id,
    clientCode:   row.client_code,
    name:         row.name,
    ownerRole:    row.owner_role,
    phone:        row.phone,
    email:        row.email,
    authUserId:   row.auth_user_id,

    city:         row.city,
    state:        row.state,
    region:       row.region,
    cep:          row.cep,
    street:       row.street,
    streetNumber: row.street_number,
    bairro:       row.bairro,
    complemento:  row.complemento,

    segment:      row.segment,
    herdSize:     row.herd_size,
    production:   row.production,
    area:         row.area,
    status:       row.status,
    hasChecklist: row.has_checklist,
    clientSince:  row.client_since,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,

    cpfCnpj:      row.cpf_cnpj,
    ie:           row.ie,
    cadPro:       row.cad_pro,

    // campos granulares do formulário de novo cadastro (tipo de documento
    // e CAD/PROs individuais) — mantidos para que a tela de cadastro
    // consiga reconstituir o formulário de origem se precisar
    docTipo:      row.doc_tipo,
    cpf:          row.cpf,
    cnpj:         row.cnpj,
    cadpro1:      row.cadpro_1,
    cadpro2:      row.cadpro_2,
    cadpro3:      row.cadpro_3,

    owner:        row.owner,
    prospect:     row.prospect,
    notes:        row.notes,
    marcaAtual:   row.marca_atual,

    // true enquanto o registro ainda não foi confirmado no Supabase
    // (criado ou editado offline, aguardando sincronização)
    pending:      !!row._pending,
  }
}

function toDB(farm) {
  return {
    id:            farm.id,
    client_code:   farm.clientCode,
    name:          farm.name,
    owner_role:    farm.ownerRole,
    phone:         farm.phone,
    email:         farm.email,

    city:          farm.city,
    state:         farm.state,
    region:        farm.region,
    cep:           farm.cep,
    street:        farm.street,
    street_number: farm.streetNumber,
    bairro:        farm.bairro,
    complemento:   farm.complemento,

    segment:       farm.segment,
    herd_size:     farm.herdSize,
    production:    farm.production,
    area:          farm.area,
    status:        farm.status ?? 'ativo',
    has_checklist: farm.hasChecklist ?? false,
    client_since:  farm.clientSince,
    seller_id:     farm.sellerId,

    cpf_cnpj:      farm.cpfCnpj,
    ie:            farm.ie,
    cad_pro:       farm.cadPro,

    // Campos granulares vindos do formulário de novo cadastro. Antes
    // essas chaves não existiam aqui, então o cadastro (que envia
    // doc_tipo/cpf/cnpj/cadpro_1/2/3) nunca gravava cpf_cnpj/cad_pro —
    // os dados digitados eram perdidos e a ficha do cliente aparecia
    // zerada. NovaFazenda.jsx agora também envia cpfCnpj/cadPro
    // consolidados diretamente, e mantemos os campos granulares aqui.
    doc_tipo:      farm.docTipo,
    cpf:           farm.cpf,
    cnpj:          farm.cnpj,
    cadpro_1:      farm.cadpro1,
    cadpro_2:      farm.cadpro2,
    cadpro_3:      farm.cadpro3,

    owner:         farm.owner,
    prospect:      farm.prospect,
    notes:         farm.notes,
    marca_atual:   farm.marcaAtual,
  }
}

function generateClientCode(farms) {
  const codes = farms
    .map(f => f.clientCode)
    .filter(c => c && c.startsWith('NUT-'))
    .map(c => parseInt(c.replace('NUT-', ''), 10))
    .filter(n => !isNaN(n))
  const next = codes.length > 0 ? Math.max(...codes) + 1 : 2841
  return `NUT-${next}`
}

export function useFarms() {
  const { user } = useAuth()
  const [farms, setFarms]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !user.id) return
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('farms').select('*').order('name')

      if (!error && data) {
        // Mantém visíveis fazendas criadas/editadas offline que ainda
        // não confirmaram no servidor (senão elas "somem" da lista até
        // a sincronização terminar).
        const pendentes = await db.outbox.where('entity').equals('farm').toArray()
        const idsPendentes = new Set(pendentes.map(p => p.entity_id))
        const cacheAtual = await db.farms_cache.toArray()
        const somenteLocais = cacheAtual.filter(f => idsPendentes.has(f.id) && !data.some(d => d.id === f.id))

        const merged = [...somenteLocais, ...data]
        await db.farms_cache.clear()
        await db.farms_cache.bulkPut(merged)
        setFarms(merged.map(fromDB))
      } else {
        // offline (ou erro de rede): usa o que tiver em cache local
        const cached = await db.farms_cache.toArray()
        setFarms(cached.map(fromDB))
      }
      setLoading(false)
    }
    load()
  }, [user?.id])

  const addFarm = useCallback(async (farmData) => {
    const id         = crypto.randomUUID()
    const clientCode = generateClientCode(farms)
    const newFarm    = {
      ...farmData,
      id,
      clientCode,
      clientSince: String(new Date().getFullYear()),
      status: 'ativo',
      sellerId: user && user.id,
      hasChecklist: false,
      createdAt: new Date().toISOString(),
    }
    const payload = toDB(newFarm)

    // Grava local primeiro (nunca falha, não depende de rede) e mostra
    // na tela na hora. Depois enfileira para enviar ao Supabase — se
    // já tiver internet, sincroniza em segundos; se não, fica na fila
    // e vai sozinho quando a conexão voltar.
    await db.farms_cache.put({ ...payload, _pending: true })
    setFarms(prev => [newFarm, ...prev])
    await enqueue({ entity: 'farm', entityId: id, op: 'upsert', payload })

    return newFarm
  }, [farms, user])

  const updateFarm = useCallback(async (id, changes) => {
    const updatedAt = new Date().toISOString()
    const payload = toDB(changes)

    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) delete payload[key]
    })
    payload.updated_at = updatedAt

    const cached = await db.farms_cache.get(id)
    if (cached) await db.farms_cache.put({ ...cached, ...payload, _pending: true })
    setFarms(prev => prev.map(f =>
      f.id === id ? { ...f, ...changes, updatedAt, pending: true } : f
    ))

    await enqueue({ entity: 'farm', entityId: id, op: 'update', payload })

    return { error: null }
  }, [])

  const removeFarm = useCallback(async (id) => {
    const { error } = await supabase.from('farms').delete().eq('id', id)
    if (!error) {
      setFarms(prev => prev.filter(f => f.id !== id))
      await db.farms_cache.delete(id)
    }
  }, [])

  const getFarm = useCallback((id) => {
    return farms.find(f => f.id === id)
  }, [farms])

  return { farms, loading, addFarm, updateFarm, removeFarm, getFarm }
}
