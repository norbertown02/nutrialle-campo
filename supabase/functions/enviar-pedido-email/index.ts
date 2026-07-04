import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = 're_ZoVHPr54_QG3PDnwugyVg78phR7LPpyqY'
const EMAIL_TO = 'norberto.neto@nutrialle.com.br'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { sale_id } = await req.json()
    if (!sale_id) return new Response('sale_id obrigatorio', { status: 400 })

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: sale, error: saleErr } = await sb.from('sales').select('*').eq('id', sale_id).single()
    if (saleErr || !sale) return new Response('Venda nao encontrada', { status: 404 })

    const { data: farm } = await sb.from('farms').select('*').eq('id', sale.farm_id).single()
    const { data: seller } = await sb.from('profiles').select('name,email,comissao_pct').eq('id', sale.seller_id).single()

    const items = sale.items || []
    const date = new Date(sale.sale_date + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })
    const fmtBRL = (n: number) => 'R$ ' + Number(n||0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })

    // Comissão
    // Prioridade: comissão definida na venda. Fallback: comissão padrão do perfil do vendedor.
    const pctComissao = Number(sale?.comissao_pct ?? seller?.comissao_pct ?? 0)
    const pctComissaoFmt = pctComissao.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const vlComissao = Number(sale.total || 0) * pctComissao / 100

    // Documento fiscal
    const docFiscal = farm?.cnpj || farm?.cpf_cnpj || farm?.cpf || '—'
    const ieNum     = farm?.ie || '—'
    const cadPro    = [farm?.cad_pro, farm?.cadpro_1, farm?.cadpro_2, farm?.cadpro_3].filter(Boolean).join(' / ') || '—'

    // Endereço completo
    const endereco = [
      farm?.street ? `${farm.street}${farm?.street_number ? ', ' + farm.street_number : ''}` : '',
      farm?.complemento || '',
      farm?.bairro || '',
      farm?.city && farm?.state ? `${farm.city} / ${farm.state}` : (farm?.city || ''),
      farm?.cep ? `CEP: ${farm.cep}` : '',
    ].filter(Boolean).join(' — ') || '—'

    const itensHtml = items.map((it: any) => {
      const qty   = it.quantity || it.qty || 1
      const price = it.unitPrice || it.unit_price || it.price || 0
      const total = price * qty
      return `<tr>
        <td style="padding:9px 12px;border-bottom:1px solid #eee;font-size:13px">${it.productName || it.name || '—'}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center">${qty}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right">${fmtBRL(price)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;font-weight:600">${fmtBRL(total)}</td>
      </tr>`
    }).join('')

    const row = (label: string, value: string, highlight = false) =>
      `<tr><td style="padding:5px 0;font-size:12px;color:#999;width:160px">${label}</td><td style="padding:5px 0;font-size:13px;font-weight:${highlight?'700':'500'};color:${highlight?'#E87722':'#0A0A0A'}">${value}</td></tr>`

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F4F6;font-family:Inter,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F6;padding:32px 16px">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%">

<!-- HEADER -->
<tr><td style="background:#0A0A0A;border-radius:12px 12px 0 0;padding:24px 28px">
  <table width="100%"><tr>
    <td>
      <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#E87722;margin-bottom:5px">NUTRIALLE &middot; PEDIDO DE VENDA</div>
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">Novo pedido recebido</div>
      <div style="font-size:12px;color:rgba(255,255,255,.35);margin-top:3px">${date} &middot; ID: ${sale_id}</div>
    </td>
    <td style="text-align:right;vertical-align:top">
      <div style="background:#E87722;border-radius:8px;padding:10px 16px;display:inline-block">
        <div style="font-size:11px;color:rgba(255,255,255,.7);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Total</div>
        <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-1px;margin-top:2px">${fmtBRL(sale.total)}</div>
      </div>
    </td>
  </tr></table>
</td></tr>

<!-- DADOS FISCAIS DO CLIENTE -->
<tr><td style="background:#fff;padding:20px 28px;border-left:1px solid #E8E8EC;border-right:1px solid #E8E8EC">
  <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#E87722;margin-bottom:12px">Dados do cliente</div>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${row('Razão Social / Nome', farm?.name || '—')}
    ${row('Produtor / Resp.', farm?.owner_name || farm?.owner || '—')}
    ${row('CNPJ / CPF', docFiscal)}
    ${row('Inscrição Estadual', ieNum)}
    ${row('Cad. Produtor', cadPro)}
    ${row('Telefone', farm?.phone || '—')}
    ${row('E-mail', farm?.email || '—')}
    ${row('Endereço', endereco)}
    ${row('Segmento', farm?.segment || '—')}
    ${row('Código do cliente', farm?.client_code || '—')}
  </table>
</td></tr>

<tr><td style="background:#fff;padding:0 28px;border-left:1px solid #E8E8EC;border-right:1px solid #E8E8EC"><div style="height:1px;background:#E8E8EC"></div></td></tr>

<!-- PRODUTOS -->
<tr><td style="background:#fff;padding:20px 28px;border-left:1px solid #E8E8EC;border-right:1px solid #E8E8EC">
  <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#E87722;margin-bottom:12px">Produtos</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    <thead><tr style="background:#F4F4F6">
      <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.5px">Produto</th>
      <th style="padding:8px 12px;text-align:center;font-size:10px;font-weight:700;color:#999;text-transform:uppercase">Qtd</th>
      <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;color:#999;text-transform:uppercase">Unit.</th>
      <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;color:#999;text-transform:uppercase">Total</th>
    </tr></thead>
    <tbody>${itensHtml}</tbody>
  </table>
</td></tr>

<!-- TOTAIS E CONDIÇÕES -->
<tr><td style="background:#fff;padding:0 28px 20px;border-left:1px solid #E8E8EC;border-right:1px solid #E8E8EC">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 12px;text-align:right;font-size:12px;color:#999">Frete: <strong style="color:#0A0A0A">${sale.frete_label || sale.frete || '—'}</strong></td></tr>
    <tr><td style="padding:6px 12px;text-align:right;font-size:12px;color:#999">Pagamento: <strong style="color:#0A0A0A">${sale.payment_term_label || '—'}</strong></td></tr>
    ${pctComissao > 0 ? `<tr><td style="padding:6px 12px;text-align:right;font-size:12px;color:#999">Comissão do representante (${pctComissaoFmt}%): <strong style="color:#0A0A0A">${fmtBRL(vlComissao)}</strong></td></tr>` : ''}
    <tr><td style="padding:12px 12px 4px;text-align:right;border-top:2px solid #0A0A0A;margin-top:8px">
      <span style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.5px">TOTAL DO PEDIDO </span>
      <span style="font-size:24px;font-weight:800;color:#E87722;letter-spacing:-1px">${fmtBRL(sale.total)}</span>
    </td></tr>
  </table>
</td></tr>

<tr><td style="background:#fff;padding:0 28px;border-left:1px solid #E8E8EC;border-right:1px solid #E8E8EC"><div style="height:1px;background:#E8E8EC"></div></td></tr>

<!-- VENDEDOR -->
<tr><td style="background:#fff;padding:16px 28px 20px;border-left:1px solid #E8E8EC;border-right:1px solid #E8E8EC;border-radius:0">
  <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#E87722;margin-bottom:10px">Vendedor responsável</div>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${row('Nome', seller?.name || '—')}
    ${row('E-mail', seller?.email || '—')}
    ${pctComissao > 0 ? row('Comissão da venda', `${pctComissaoFmt}% = ${fmtBRL(vlComissao)}`, true) : ''}
  </table>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#0A0A0A;border-radius:0 0 12px 12px;padding:14px 28px">
  <div style="font-size:11px;color:rgba(255,255,255,.25);text-align:center">Gerado automaticamente pelo sistema Nutrialle &middot; N&atilde;o responda este e-mail</div>
</td></tr>

</table></td></tr></table>
</body></html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Nutrialle <onboarding@resend.dev>',
        to: [EMAIL_TO],
        reply_to: seller?.email || EMAIL_TO,
        subject: `Novo Pedido - ${farm?.name || 'Cliente'} - ${fmtBRL(sale.total)}`,
        html,
      }),
    })

    const resData = await res.json()
    if (!res.ok) return new Response(JSON.stringify({ error: resData }), { status: 500 })
    return new Response(JSON.stringify({ ok: true, id: resData.id }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Erro:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
