import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import { supabase } from './supabase'

function fromDB(row) {
  if (!row) return null
  return {
    id:           row.id,
    clientCode:   row.client_code,
    name:         row.name,
    ownerName:    row.owner_name,
    ownerRole:    row.owner_role,
    phone:        row.phone,
    city:         row.city,
    state:        row.state,
    region:       row.region,
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
    cadPro:       row.cad_pro,
    cep:          row.cep,
    street:       row.street,
    streetNumber: row.street_number,
    owner:        row.owner,
    prospect:     row.prospect,
    notes:        row.notes,
    email:        row.email,
    email:        row.email,
    email:        row.email,
    marcaAtual:   row.marca_atual,
  }
}

function toDB(farm) {
  return {
    id:            farm.id,
    client_code:   farm.clientCode,
    name:          farm.name,
    owner_name:    farm.ownerName,
    owner_role:    farm.ownerRole,
    phone:         farm.phone,
    city:          farm.city,
    state:         farm.state,
    region:        farm.region,
    segment:       farm.segment,
    herd_size:     farm.herdSize,
    production:    farm.production,
    area:          farm.area,
    status:        farm.status ?? 'ativo',
    has_checklist: farm.hasChecklist ?? false,
    client_since:  farm.clientSince,
    seller_id:     farm.sellerId,
    cpf_cnpj:      farm.cpfCnpj,
    cad_pro:       farm.cadPro,
    cep:           farm.cep,
    street:        farm.street,
    street_number: farm.streetNumber,
    owner:         farm.owner,
    prospect:      farm.prospect,
    notes:         farm.notes,
    email:         farm.email,
    email:         farm.email,
    email:         farm.email,
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
      let query = supabase.from('farms').select('*').order('name')
      const { data, error } = await query
      if (!error && data) setFarms(data.map(fromDB))
      setLoading(false)
    }
    load()
  }, [user?.id])

  const addFarm = useCallback(async (farmData) => {
    const id         = 'f' + Date.now()
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
    const { data: insertData, error } = await supabase.from('farms').insert(toDB(newFarm)).select()
    console.log('INSERT farms result:', { insertData, error, payload: toDB(newFarm) })
    if (!error) setFarms(prev => [newFarm, ...prev])
    return newFarm
  }, [farms])

  const updateFarm = useCallback(async (id, changes) => {
    const updatedAt = new Date().toISOString()
    const { error } = await supabase
      .from('farms')
      .update({ ...toDB(changes), updated_at: updatedAt })
      .eq('id', id)
    if (!error) {
      setFarms(prev => prev.map(f =>
        f.id === id ? { ...f, ...changes, updatedAt } : f
      ))
    }
  }, [])

  const removeFarm = useCallback(async (id) => {
    const { error } = await supabase.from('farms').delete().eq('id', id)
    if (!error) setFarms(prev => prev.filter(f => f.id !== id))
  }, [])

  const getFarm = useCallback((id) => {
    return farms.find(f => f.id === id)
  }, [farms])

  return { farms, loading, addFarm, updateFarm, removeFarm, getFarm }
}
