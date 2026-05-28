import { useState } from 'react'
import { IconArrowLeft, IconUser, IconLogout, IconChevronDown } from '@tabler/icons-react'
import { useAuth } from '../lib/useAuth.jsx'
import logo from '../assets/logo-nutrialle.jpg'

export default function AppBar({ title, onBack, action }) {
  const { user, logout } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <>
      <div className="appbar">
        {onBack ? (
          <button className="bar-action" onClick={onBack}>
            <IconArrowLeft size={18} />
          </button>
        ) : (
          <img
            src={logo}
            alt="Nutrialle"
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
          />
        )}

        <h1>{title}</h1>

        {action || (
          <button
            onClick={() => setMenuAberto(p => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)', padding: '4px 6px' }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconUser size={15} color="#1a0d00" />
            </div>
            <IconChevronDown size={13} style={{ transition: 'transform 0.2s', transform: menuAberto ? 'rotate(180deg)' : 'none' }} />
          </button>
        )}
      </div>

      {/* Dropdown de perfil */}
      {menuAberto && (
        <>
          {/* Overlay para fechar */}
          <div onClick={() => setMenuAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />

          <div style={{
            position: 'absolute', top: 54, right: 12, zIndex: 100,
            background: 'var(--surface-2)', border: '1px solid var(--line)',
            borderRadius: 12, minWidth: 200, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {/* Info do usuário */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{user?.email}</div>
              <div style={{ fontSize: 10, color: 'var(--orange)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{user?.role}</div>
            </div>

            {/* Sair */}
            <button
              onClick={() => { setMenuAberto(false); logout() }}
              style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 13, fontFamily: 'inherit' }}
            >
              <IconLogout size={15} /> Sair da conta
            </button>
          </div>
        </>
      )}
    </>
  )
}