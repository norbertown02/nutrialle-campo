# Nutrialle IA — protótipo local (não publicado)

Esta branch contém uma tela de chat e um servidor Node limitado a 127.0.0.1. **Ainda não há acesso a produtos, clientes, dados do Ultra, documentos, fotos ou publicação para vendedores.** Não disponibilize o gateway diretamente na internet.

## Mac M2 8 GB
1. Instale o Ollama: https://ollama.com/download/mac
2. No Terminal: `ollama pull qwen3.5:4b`
3. Verifique: `ollama list` e `curl http://127.0.0.1:11434/api/tags`
4. Clone esta branch e execute `npm install`.
5. No terminal da pasta do projeto, configure a chave **publicável** do Supabase (nunca service_role): `export SUPABASE_PUBLISHABLE_KEY='SUA_CHAVE_PUBLICAVEL'`.
6. Inicie `node server/ai-local.mjs`.
7. Em outro terminal, execute `npm run dev`, autentique-se no Campo e entre em `/ia`.
8. Caso o Vite use outra porta, ajuste allowedOrigins em server/ai-local.mjs.

A tela usa `VITE_NUTRIALLE_AI_URL` (padrão `http://127.0.0.1:8787`). O navegador e o gateway precisam estar no mesmo Mac para este teste; HTTPS de produção não pode chamar diretamente HTTP localhost de outro dispositivo. Para uso remoto, criar depois um gateway HTTPS autenticado e um túnel privado seguro.

Este piloto valida a conexão com Ollama e login via Supabase. Não envie dados confidenciais até revisar RLS, autorização de negócio, logs, retenção e transporte. O gateway não tem chave service_role, não executa SQL e não permite ferramentas de escrita.
