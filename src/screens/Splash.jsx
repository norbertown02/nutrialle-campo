import { useEffect } from 'react'
import logo from '../assets/logo-nutrialle.jpg'

export default function Splash() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <img
        src={logo}
        alt="Nutrialle"
        style={{
          width: 100, height: 100, borderRadius: 24,
          objectFit: 'cover', marginBottom: 24,
          animation: 'fadeIn 0.6s ease',
        }}
      />

      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 32, fontWeight: 700, letterSpacing: 2,
        color: 'var(--text)', marginBottom: 6,
        animation: 'fadeIn 0.8s ease',
      }}>
        NUTRIALLE
      </div>

      <div style={{
        fontSize: 13, color: 'var(--text-faint)', marginBottom: 52,
        animation: 'fadeIn 1s ease',
      }}>
        Campo
      </div>

      <div style={{
        width: 180, height: 3, borderRadius: 4,
        background: 'var(--surface-3)', overflow: 'hidden',
        animation: 'fadeIn 1s ease',
      }}>
        <div style={{
          height: '100%', borderRadius: 4,
          background: 'var(--orange)',
          animation: 'progress 1.8s ease forwards',
        }} />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  )
}