import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconPhone, IconBrandWhatsapp, IconMapPin,
  IconEdit, IconTrash, IconClipboardList, IconCalendarPlus,
  IconReceipt, IconUser, IconBuildingWarehouse, IconFileText,
  IconChecklist, IconRoute, IconCash, IconChartBar, IconDownload,
  IconLock, IconCopy
} from '@tabler/icons-react'
import { useFarms } from '../lib/useFarms'
import { showToast } from '../lib/toast'
import { criarAcessoCliente } from '../lib/clienteAcesso'
import { useVisits } from '../lib/useVisits'
import { useChecklists } from '../lib/useChecklists'
import { gerarRelatorioChecklist } from '../lib/gerarRelatorioChecklist'
import { CHECKLIST_TEMPLATES } from '../data/checklists'
import { useSales } from '../lib/useSales'
import { useConfig } from '../lib/useConfig'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'

export default function FichaCliente(){
  return <div className="content"><div className="empty"><p>Carregando cliente...</p></div></div>
}
