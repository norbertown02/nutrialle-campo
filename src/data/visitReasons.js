// Catálogo enxuto para registro de visitas. Os identificadores históricos
// continuam reconhecidos em relatórios e no histórico, sem aparecer no novo formulário.
export const VISIT_PURPOSES = [
 ['prospeccao','Prospecção de novo cliente'],
 ['negociacao','Negociação comercial / cotação'],
 ['pedido','Fechamento de pedido'],
 ['pos_venda','Pós-venda e acompanhamento técnico'],
 ['diagnostico','Diagnóstico da propriedade'],
 ['recompra','Recompra e manutenção da carteira'],
 ['problema','Resolução de problema ou reclamação'],
]

export const VISIT_REASONS = {
 positiva: [
  ['pedido_fechado','Pedido fechado'],
  ['cotacao_solicitada','Cotação ou negociação iniciada'],
  ['intencao_recompra','Oportunidade de recompra'],
  ['resultado_tecnico','Resultado técnico positivo'],
  ['relacionamento','Relacionamento fortalecido'],
 ],
 neutra: [
  ['avaliando','Cliente avaliando proposta'],
  ['estoque_cliente','Cliente ainda possui estoque'],
  ['compra_futura','Compra prevista para depois'],
  ['acompanhamento','Acompanhamento sem nova demanda'],
  ['retorno_futuro','Aguardando retorno ou decisão'],
 ],
 negativa: [
  ['preco_alto','Preço ou condição comercial'],
  ['perdeu_concorrente','Compra realizada com concorrente'],
  ['prazo_entrega','Entrega ou falta de produto'],
  ['problema_tecnico','Insatisfação técnica ou com o produto'],
  ['sem_interesse','Sem interesse na compra'],
 ],
}

// Rótulos dos motivos antigos para não prejudicar a leitura de visitas anteriores.
const LEGACY_VISIT_REASONS = {
 positiva: [
  ['interesse_compra','Cliente demonstrou interesse em comprar'],
  ['intencao_recompra','Cliente sinalizou intenção de recompra'],
  ['aumento_mix','Aumento de volume ou ampliação do mix'],
  ['novo_produto','Oportunidade de introduzir novo produto'],
  ['satisfacao_produto','Cliente satisfeito com os produtos Nutrialle'],
  ['melhoria_tecnica','Melhoria de desempenho após recomendação técnica'],
  ['indicacao','Nova oportunidade ou indicação de cliente'],
 ],
 neutra: [
  ['cotacao_aguardando','Cotação enviada, aguardando decisão'],
  ['teste_produto','Cliente deseja testar o produto antes de decidir'],
  ['comparando','Cliente está comparando com concorrentes'],
  ['decisor_ausente','Decisor não estava presente'],
  ['tecnico_estavel','Acompanhamento técnico sem alteração relevante'],
  ['aprovacao_interna','Negociação depende de aprovação interna'],
 ],
 negativa: [
  ['concorrente_condicao','Concorrente apresentou melhor condição comercial'],
  ['pagamento','Prazo ou condição de pagamento inadequada'],
  ['frete','Frete ou custo logístico inviabilizou a venda'],
  ['sem_estoque','Produto indisponível ou sem estoque'],
  ['portfolio','Portfólio não atende à necessidade do cliente'],
  ['insatisfacao_resultado','Cliente insatisfeito com resultado do produto'],
  ['qualidade','Problema de qualidade, embalagem ou apresentação'],
  ['falha_suporte','Cliente relatou falha no atendimento ou suporte'],
  ['financeiro','Problema financeiro ou restrição de crédito'],
  ['reclamacao_pendente','Reclamação ou problema anterior ainda não resolvido'],
 ],
}

export const visitPurposeLabel = id => VISIT_PURPOSES.find(x=>x[0]===id)?.[1] || id || 'Não informado'
export const visitReasonLabel = id => [...Object.values(VISIT_REASONS).flat(), ...Object.values(LEGACY_VISIT_REASONS).flat()].find(x=>x[0]===id)?.[1] || id || 'Não informado'
