import { IconArrowLeft } from '@tabler/icons-react'

export default function AppBar({ title, onBack, action }) {
  return (
    <div className="appbar">
      {onBack ? (
        <button className="bar-action" onClick={onBack}>
          <IconArrowLeft size={18} />
        </button>
      ) : (
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'var(--orange)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#1a0d00', fontWeight: 700, fontSize: 14,
          fontFamily: "'Barlow Condensed', sans-serif"
        }}>
          N
        </div>
      )}
      <h1>{title}</h1>
      {action}
    </div>
  )
}