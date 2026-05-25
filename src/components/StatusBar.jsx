import { IconAntenna, IconWifi, IconBattery3 } from '@tabler/icons-react'

export default function StatusBar() {
  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`

  return (
    <div className="statusbar">
      <span>{time}</span>
      <div className="icons">
        <IconAntenna size={15} />
        <IconWifi size={15} />
        <IconBattery3 size={17} />
      </div>
    </div>
  )
}