import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconCalendar, IconChevronDown, IconFileText, IconTarget,
  IconReceipt2, IconTrendingUp, IconUsers, IconChecklist, IconBulb,
} from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth.jsx'
import '../styles/dashboard-vendas-v4.css'

const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','