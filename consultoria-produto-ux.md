# Consultoria de produto e UX — Nutrialle Campo

Revisão feita lendo o código real de cada tela e fluxo do app (não é uma opinião genérica de UX — cada ponto abaixo eu confirmei no código, com o arquivo e a linha onde acontece). O objetivo foi entender se a lógica de negócio faz sentido de ponta a ponta e onde o app pode ficar mais fácil de usar no dia a dia do vendedor em campo.

## Visão geral

A espinha dorsal do app faz sentido: cliente (fazenda) → visita/checklist → cotação → venda, com agenda e tabela de preços dando suporte. É um fluxo de vendas B2B de campo bem modelado, e a base técnica (offline-first, sincronização automática, RLS por vendedor) que construímos nas últimas sessões está sólida.

O que encontrei de errado não é na arquitetura — é em pontos específicos onde uma regra de negócio foi aplicada em um lugar do app e esquecida em outro, ou onde uma tela promete algo que o código não cumpre. São exatamente o tipo de coisa que passa despercebida quando o app cresce tela por tela ao longo do tempo.

## O que já funciona bem (vale manter)

A conversão automática de "prospecto" para "cliente ativo" quando uma cotação vira venda (`DetalheCotacao.jsx`, linha ~229) é um detalhe bem pensado — ninguém precisa lembrar de fazer essa atualização manualmente. O checklist técnico corretamente só aparece para clientes ativos, não para prospectos (`PickChecklist.jsx`) — faz sentido, já que avaliar tecnicamente uma fazenda que ainda nem comprou não tem propósito. A tabela de preços (`Precos.jsx`) está limpa e consistente com o modelo R$/kg que corrigimos. E a ficha do cliente reunindo visitas, vendas e checklists em abas é uma boa forma de dar contexto rápido antes de uma visita.

## Inconsistências e problemas de lógica encontrados

### Prioridade alta

**O preço por R$/kg não chegou à venda direta.** Quando corrigimos a precificação, o ajuste (R$/kg como campo principal, preço do saco sempre derivado) foi implementado na Cotação (`NovaCotacao.jsx`, `EditarCotacao.jsx`) mas não na Venda direta (`NovaVenda.jsx`, linha ~289) — lá o vendedor ainda edita "Preço unit. (R$)" do saco inteiro diretamente, do jeito antigo. Ou seja: se o vendedor pula a cotação e registra a venda direto, a regra que você pediu ("precificação sempre por R$/kg") não é aplicada. Vale levar a mesma mudança pra lá.

**O número de WhatsApp do time administrativo ainda é um placeholder.** Em `Vendas.jsx`, linha 11: `const ADMIN_WHATSAPP = '5545999999999'`, com um comentário no próprio código dizendo "Norberto, ajuste aqui quando definir o número oficial". Esse número é usado no fluxo de "Fechar dia", que manda os pedidos pendentes pro time administrativo lançar no Ultra Sistemas. Se esse número não foi trocado, o "Fechar Dia" está mandando mensagem para um número que não existe.

**"Fechar Dia" marca os pedidos como enviados antes de confirmar o envio de verdade.** No mesmo fluxo (`Vendas.jsx`, linha ~136), o app abre o WhatsApp com a mensagem pronta e, no mesmo instante, já marca todos os pedidos pendentes como `enviado` — antes mesmo do vendedor apertar "enviar" dentro do WhatsApp. Se ele voltar sem mandar (ou o WhatsApp não abrir), o sistema já acha que o pedido foi comunicado ao administrativo, quando na prática não foi. Isso pode gerar pedidos "fantasmas" — o cliente acha que comprou, o vendedor acha que já mandou, e ninguém lança no ERP.

**Excluir um cliente é uma ação destrutiva demais para o risco que carrega.** Em `FichaCliente.jsx`, o botão "Remover da carteira" faz um delete definitivo direto no Supabase (`useFarms.js`, `removeFarm`), sem soft-delete, e o próprio aviso na tela diz "os dados históricos serão perdidos" — ou seja, apagar uma fazenda por engano apaga também vendas, visitas e checklists associados. A confirmação é só um segundo toque no mesmo botão. Além disso, esse delete não passa pela fila offline: se o vendedor tentar remover um cliente sem internet, a operação falha silenciosamente (sem toast, sem aviso) e o app navega de volta pra lista como se nada tivesse acontecido. Recomendo trocar por um "arquivar" (soft delete, reversível) em vez de apagar de verdade, e ao menos pedir para digitar o nome do cliente antes de confirmar — padrão comum pra ações irreversíveis.

### Prioridade média

**"Prospecção" e "Cotações" são a mesma tela com dois nomes.** A aba inferior chama de "Cotações", a própria tela (`Prospeccao.jsx`) mostra o título "Prospecção" — e não é uma prospecção de leads, é literalmente a lista de cotações. Isso confunde quem está aprendendo o app: alguém procurando "onde vejo os leads que ainda não converti" não vai necessariamente pensar em abrir "Cotações".

**Não dá pra criar uma cotação a partir da ficha do cliente.** Em `FichaCliente.jsx`, os atalhos rápidos são Checklist, Visita, Dados e Venda — cotação não está lá. Pra cotar um produto pra um cliente específico, o vendedor precisa sair da ficha, ir na aba Cotações, tocar em "Nova Cotação" e procurar a fazenda de novo. Dado que cotação é o passo natural antes da venda (e tem até destaque na tela inicial), essa ausência específica na ficha do cliente é estranha.

**Mesmo se esse atalho for adicionado, hoje ele quebraria.** `NovaVenda.jsx` e `NovaVisita.jsx` recebem a fazenda pré-selecionada pela URL usando o parâmetro `farm` (`?farm=<id>`), mas `NovaCotacao.jsx` espera `farm_id` (`?farm_id=<id>`). Se alguém copiar o mesmo padrão de link ao criar esse atalho, a fazenda não viria pré-selecionada — um detalhe pequeno, mas que vale corrigir quando for mexer nisso.

**O link "Cadastrar novo lead" dentro da cotação não marca o cliente como prospecto.** Em `NovaCotacao.jsx`, linha 172, o botão navega para `/clientes/novo?prospect=true` — a intenção é clara (criar já como prospecto) — mas `NovaFazenda.jsx` nunca lê esse parâmetro da URL. Resultado: todo lead criado por esse caminho entra como cliente ativo normal, não como prospecto, o que quebra silenciosamente a distinção prospecto/cliente em um dos pontos onde ela mais faria sentido.

**A ficha do cliente não mostra o histórico de cotações.** As abas de histórico ali são Visitas, Vendas e Checklists — cotações enviadas pra aquele cliente não aparecem em lugar nenhum da ficha dele. Pra saber se já cotou algo pra um cliente, o vendedor precisa ir na aba Cotações geral e procurar manualmente.

**O card "propostas" na Home/Dashboard conta vendas, não cotações.** Em `Home.jsx`, linha 77, `propostasMes` é calculado a partir de `sales` (vendas fechadas), mas aparece como subtítulo do card "Vendas no mês" com o rótulo "X propostas". Isso é redundante (é basicamente a mesma métrica contada duas vezes) e o nome "proposta" sugere que deveria estar contando cotações enviadas, não vendas.

**O aviso de "cotação será sinalizada para aprovação" não existe de verdade.** Em `NovaCotacao.jsx`, quando um item tem desconto acima de 10%, aparece um aviso dizendo que a cotação "será sinalizada para aprovação" — mas o payload salvo no Supabase não tem nenhum campo equivalente a isso. Na Venda (`NovaVenda.jsx`), esse mecanismo existe de verdade (`needsApproval: hasOverDiscount`, usado depois em `Vendas.jsx` pra filtrar pedidos que precisam de aprovação). Ou seja, o aviso na cotação promete um controle que só foi implementado no lado da venda.

### Prioridade baixa

O cadastro de fazenda guarda `owner` e `ownerName`/`owner_name` como dois campos separados para a mesma informação (nome do responsável), com o app preferindo um e caindo pro outro como fallback (`useFarms.js`). Não quebra nada hoje, mas é dívida técnica que vale limpar numa próxima passada — geralmente sinal de uma renomeação de campo que não foi totalmente migrada.

A tela de Mercado (cotação de dólar, boi, milho e soja) depende de dois serviços de proxy público (`corsproxy.io`, `allorigins.win`) para contornar CORS. São serviços gratuitos, sem garantia de disponibilidade — se um deles sair do ar, essa tela para de funcionar sem aviso claro pro vendedor além de "não carregou".

A barra de navegação inferior tem 6 abas (Início, Clientes, Cotações, Agenda, Vendas, Preços) — no limite do confortável pra toque em tela de celular. Não chega a ser um problema grave, mas se algum dia quiser adicionar mais uma seção, vale considerar mover "Preços" pra dentro de outra tela em vez de crescer a barra.

## Sugestões de simplificação

Duas coisas fariam o fluxo diário mais redondo sem exigir muito trabalho: primeiro, ligar melhor a ficha do cliente às cotações — mostrar as cotações daquele cliente na própria ficha (como já acontece com vendas) e adicionar o atalho de "Nova Cotação" ali. Segundo, decidir um nome só para "cotações/prospecção" e usá-lo em todo lugar (tab bar, título da tela, mensagens) — hoje um vendedor novo pode genuinamente não saber que são a mesma coisa.

Vale também revisar se o conceito de "prospecto" merece mais destaque na tela de Clientes — hoje ele só aparece dentro do fluxo de cotação e na ficha individual, mas nunca como filtro na lista principal, mesmo pautando decisões reais (o que aparece pra checklist, o que conta como cliente ativo).

## Resumo priorizado

Se for atacar por ordem de risco/impacto: primeiro confirmar (e corrigir se precisar) o número de WhatsApp do administrativo e revisar o "marcar como enviado" otimista do Fechar Dia — isso afeta dinheiro entrando no ERP todo dia. Depois, levar a precificação R$/kg pra Venda direta, já que é a mesma regra de negócio que você definiu pra cotação. Em seguida, trocar a exclusão de cliente por um arquivamento reversível. O resto (nomenclatura, link de cotação na ficha do cliente, parâmetros de URL quebrados, campo de aprovação da cotação) são melhorias de coerência que valem a pena mas não têm o mesmo risco imediato.

Se quiser, posso implementar qualquer um desses pontos — me diga por onde prefere começar.
