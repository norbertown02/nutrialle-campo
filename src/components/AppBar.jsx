import { IconArrowLeft } from '@tabler/icons-react'
import logo from '../assets/logo-nutrialle.jpg'

export default function AppBar({ title, onBack, action }) {
  return (
    <div className="appbar">
      {onBack ? (
        <button className="bar-action" onClick={onBack}>
          <IconArrowLeft size={18} />
        </button>
      ) : (
        <img
          src={logo}
          alt="Nutrialle"
          style={{ width: 62, height: 62, borderRadius: 8, objectFit: 'cover' }}
        />
      )}
      <h1>{title}</h1>
      {action}
    </div>
  )
}