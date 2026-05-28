import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'nutrialle_appointments'

function loadAppointments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAppointments(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    console.error('Erro ao salvar compromissos:', e)
  }
}

export function useAppointments() {
  const [appointments, setAppointments] = useState(loadAppointments)

  useEffect(() => {
    saveAppointments(appointments)
  }, [appointments])

  const addAppointment = useCallback((data) => {
    setAppointments(prev => {
      const item = {
        ...data,
        id: 'a' + Date.now(),
        status: 'agendado',
        createdAt: new Date().toISOString(),
      }
      return [...prev, item]
    })
  }, [])

  const removeAppointment = useCallback((id) => {
    setAppointments(prev => prev.filter(a => a.id !== id))
  }, [])

  const markAsDone = useCallback((id) => {
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'realizado', doneAt: new Date().toISOString() } : a
    ))
  }, [])

  return { appointments, addAppointment, removeAppointment, markAsDone }
}