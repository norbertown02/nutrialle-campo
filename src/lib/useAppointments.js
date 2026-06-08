import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

function fromDB(row) {
  if (!row) return null
  return {
    id:              row.id,
    farmId:          row.farm_id,
    title:           row.title,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    city:            row.city,
    notes:           row.notes,
    status:          row.status,
    doneAt:          row.done_at,
    createdAt:       row.created_at,
    kind:            row.kind || 'visita',
  }
}

export function useAppointments() {
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
      if (!error && data) setAppointments(data.map(fromDB))
    }
    load()
  }, [])

  const addAppointment = useCallback(async (data) => {
    const item = {
      id:               'a' + Date.now(),
      farm_id:          data.farmId || null,
      title:            data.title,
      appointment_date: data.appointmentDate,
      appointment_time: data.appointmentTime || null,
      city:             data.city || null,
      notes:            data.notes || null,
      status:           'agendado',
      kind:             data.kind || 'visita',
    }
    const { error } = await supabase.from('appointments').insert(item)
    if (!error) setAppointments(prev => [...prev, fromDB(item)])
  }, [])

  const removeAppointment = useCallback(async (id) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (!error) setAppointments(prev => prev.filter(a => a.id !== id))
  }, [])

  const markAsDone = useCallback(async (id) => {
    const doneAt = new Date().toISOString()
    const { error } = await supabase.from('appointments').update({ status: 'realizado', done_at: doneAt }).eq('id', id)
    if (!error) setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'realizado', doneAt } : a))
  }, [])

  return { appointments, addAppointment, removeAppointment, markAsDone }
}
