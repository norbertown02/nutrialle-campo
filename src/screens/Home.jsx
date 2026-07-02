import {
  IconClipboardList, IconUserPlus,
  IconMapPin, IconClock, IconCalendar, IconFileText,
  IconChartBar, IconSend, IconArrowRight
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.jsx'
import { useFarms } from '../lib/useFarms'
import { useVisits } from '../lib/useVisits'
import { useSales } from '../lib/useSales'
import { useAppointments } from '../lib/useAppointments'

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function hoje() { return new Date().toISOString().slice(0, 10) }
function mesAtual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function fmtMoeda(n) {
  if (n >= 1000000) return `R$ ${(n/1000000).toFixed(1)}M`
  if (n >= 1000)    return `R$ ${(n/1000).toFixed(0)}k`
  return `R$ ${n.toFixed(0)}`
}

export default function Home() {
  const navigate = useNavigate()
  const { user }  = useAuth()
  const { farms } = useFarms()
  const { visits } = useVisits()
  const { sales }  = useSales()
  const { appointments } = useAppointments()

  const primeiroNome = user?.name?.split(' ')[0] || 'Vendedor'

  const visitasHoje   = visits.filter(v => v.visitDate === hoje()).length
  const visitasMes    = visits.filter(v => v.visitDate?.startsWith(mesAtual())).length
  const vendasMes     = sales.filter(s => s.saleDate?.startsWith(mesAtual())).reduce((a, s) => a + (Number(s.total) || 0), 0)
  const totalClientes = farms.length

  const proximosCompromissos = appointments
    .filter(a => a.status === 'agendado' && a.appointmentDate >= hoje())
    .sort((a, b) => (a.appointmentDate||'').localeCompare(b.appointmentDate||''))
    .slice(0, 3)

  return (
    <div style={{paddingBottom:100}}>

      {/* ── Banner preto — igual portal ── */}
      <div style={{
        background:'#0A0A0A',
        padding:'28px 18px 24px',
        position:'relative',overflow:'hidden',
      }}>
        <div style={{
          position:'absolute',top:-60,right:-60,
          width:180,height:180,borderRadius:'50%',
          background:'#E87722',opacity:.07,
          filter:'blur(40px)',pointerEvents:'none'
        }}/>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:12}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#E87722',marginBottom:6}}>{saudacao()}</div>
            <div style={{fontSize:24,fontWeight:800,letterSpacing:'-0.5px',color:'#F2F2F2',lineHeight:1.1}}>Olá, {primeiroNome}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:4}}>
              {proximosCompromissos.length > 0
                ? `${proximosCompromissos.length} compromisso${proximosCompromissos.length > 1 ? 's' : ''} pendente${proximosCompromissos.length > 1 ? 's' : ''}`
                : 'Nenhum compromisso agendado'}
            </div>
          </div>
          {/* Badge vendas no banner */}
          {vendasMes > 0 && (
            <div style={{
              background:'#E87722',borderRadius:10,
              padding:'10px 14px',textAlign:'center',flexShrink:0
            }}>
              <div style={{fontSize:18,fontWeight:800,letterSpacing:'-1px',color:'#fff',lineHeight:1}}>{fmtMoeda(vendasMes)}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.7)',fontWeight:600,marginTop:3,textTransform:'uppercase',letterSpacing:'0.5px'}}>este mês</div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs em strip branca ── */}
      <div style={{
        display:'grid',gridTemplateColumns:'1fr 1fr 1fr',
        background:'#FFFFFF',
        borderBottom:'1px solid #E2E2E8',
      }}>
        {[
          {label:'Visitas hoje', value:visitasHoje, sub:`${visitasMes} no mês`},
          {label:'Clientes', value:totalClientes, sub:'na carteira'},
          {label:'Visitas no mês', value:visitasMes, sub:'registradas'},
        ].map((k, i) => (
          <div key={i} style={{
            padding:'16px 14px',
            borderRight: i < 2 ? '1px solid #E2E2E8' : 'none',
          }}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#999',marginBottom:6}}>{k.label}</div>
            <div style={{fontSize:24,fontWeight:800,letterSpacing:'-1px',color:'#E87722',lineHeight:1,marginBottom:2}}>{k.value}</div>
            <div style={{fontSize:10,color:'#999'}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{padding:'16px 16px 0'}}>

        {/* ── CTAs principais ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
          {/* Nova Cotação — laranja */}
          <button onClick={() => navigate('/prospeccao/nova')} style={{
            background:'#E87722',color:'#fff',border:'none',
            borderRadius:12,padding:'16px 14px',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'flex-start',gap:8,
            fontFamily:'Inter,sans-serif',
          }}>
            <div style={{
              width:32,height:32,borderRadius:8,
              background:'rgba(255,255,255,.2)',
              display:'flex',alignItems:'center',justifyContent:'center'
            }}>
              <IconFileText size={16} color="#fff"/>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>Nova Cotação</div>
          </button>

          {/* Registrar Visita — preto */}
          <button onClick={() => navigate('/visitas/nova')} style={{
            background:'#0A0A0A',color:'#fff',border:'none',
            borderRadius:12,padding:'16px 14px',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'flex-start',gap:8,
            fontFamily:'Inter,sans-serif',
          }}>
            <div style={{
              width:32,height:32,borderRadius:8,
              background:'rgba(232,119,34,.2)',
              display:'flex',alignItems:'center',justifyContent:'center'
            }}>
              <IconMapPin size={16} color="#E87722"/>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>Registrar Visita</div>
          </button>
        </div>

        {/* ── Atalhos secundários ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:22}}>
          {[
            {icon:<IconUserPlus size={15}/>, label:'Nova Fazenda', path:'/clientes/novo'},
            {icon:<IconClipboardList size={15}/>, label:'Checklist', path:'/checklist'},
            {icon:<IconSend size={15}/>, label:'Agendar', path:'/agenda/novo'},
          ].map((a, i) => (
            <button key={i} onClick={() => navigate(a.path)} style={{
              background:'#FFFFFF',
              border:'1px solid #E2E2E8',
              borderRadius:10,padding:'12px 10px',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:6,
              fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:600,
              color:'#666',
            }}>
              <span style={{color:'#E87722'}}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        {/* ── Próximos compromissos ── */}
        <div style={{
          fontSize:10,fontWeight:700,letterSpacing:'1.2px',
          textTransform:'uppercase',color:'#999',marginBottom:10,
        }}>Próximos compromissos</div>

        {proximosCompromissos.length === 0 ? (
          <div style={{
            background:'#FFFFFF',border:'1px solid #E2E2E8',
            borderRadius:12,padding:'24px',
            textAlign:'center',color:'#999',fontSize:13
          }}>
            <IconCalendar size={24} style={{marginBottom:6,opacity:.3,display:'block',margin:'0 auto 6px'}}/>
            Nenhum compromisso agendado
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {proximosCompromissos.map(apt => {
              const farm = farms.find(f => f.id === apt.farmId)
              const ehHoje = apt.appointmentDate === hoje()
              return (
                <div key={apt.id} onClick={() => navigate('/agenda')} style={{
                  background:'#FFFFFF',
                  border:'1px solid #E2E2E8',
                  borderLeft: ehHoje ? '3px solid #E87722' : '1px solid #E2E2E8',
                  borderRadius:10,padding:'12px 14px',cursor:'pointer',
                  display:'flex',alignItems:'center',gap:12,
                }}>
                  <div style={{
                    width:34,height:34,borderRadius:8,
                    background: ehHoje ? '#E87722' : '#F4F4F6',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    flexShrink:0
                  }}>
                    <IconClock size={15} color={ehHoje ? '#fff' : '#999'}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,color:'#0A0A0A'}}>
                      {farm?.name || apt.title || 'Compromisso'}
                    </div>
                    <div style={{fontSize:11,color:'#999',marginTop:2,display:'flex',alignItems:'center',gap:4}}>
                      <IconMapPin size={10}/>
                      {farm?.city || apt.city || '—'}
                      {apt.appointmentTime ? ` · ${apt.appointmentTime.slice(0,5)}` : ''}
                      {!ehHoje && ` · ${new Date(apt.appointmentDate + 'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}`}
                    </div>
                  </div>
                  {ehHoje && (
                    <span style={{
                      fontSize:9,fontWeight:700,
                      background:'#E87722',color:'#fff',
                      borderRadius:4,padding:'2px 7px',
                      letterSpacing:'0.5px',flexShrink:0
                    }}>HOJE</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Link dashboard ── */}
        <button onClick={() => navigate('/dados')} style={{
          width:'100%',marginTop:12,
          background:'#0A0A0A',border:'none',
          borderRadius:10,padding:'12px 14px',cursor:'pointer',
          display:'flex',alignItems:'center',gap:9,
          fontFamily:'Inter,sans-serif',fontSize:13,fontWeight:500,
          color:'rgba(255,255,255,.6)',
        }}>
          <span style={{color:'#E87722'}}><IconChartBar size={16}/></span>
          Ver dashboard completo
          <IconArrowRight size={14} style={{marginLeft:'auto',color:'rgba(255,255,255,.3)'}}/>
        </button>

      </div>
    </div>
  )
}
