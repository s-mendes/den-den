# 🐚 Den Den

**Seu secretário pessoal de vida, em Discord.**

Inspirado no [Den Den Mushi](https://onepiece.fandom.com/wiki/Den_Den_Mushi) de *One Piece* — o sistema de comunicação que conecta o mundo inteiro — o Den Den conecta sua agenda, metas, side projects e contexto de vida num único bot que te empurra na direção dos seus sonhos.

Ele não é um gerenciador de tarefas. Ele é um **secretário motivador** que conhece sua vida inteira, conversa em linguagem natural (PT ou EN) e te cobra quando você está desviando do caminho.

---

## O que ele faz

- 📅 **Agenda e lembretes**: compromissos, reuniões, entregas, eventos pessoais
- 🎯 **Metas com progresso**: "quero trabalhar 30h extras esse mês", "quero lançar X em junho"
- 🛠️ **Projetos e GitHub**: lê issues, milestones e commits — e reorganiza prazos quando a vida muda
- 🧠 **Perfil vivo**: sabe onde você trabalha, seus projetos, seus sonhos de longo prazo
- 🌊 **Contexto temporário**: "mudei de casa essa semana" e ele ajusta tudo a partir disso
- 🔔 **Notificações proativas**: bom dia matinal, lembretes de eventos, check noturno, resumo semanal

Tudo em linguagem natural. Você fala normal, o Den Den interpreta.

---

## Provedores de IA suportados

O Den Den é **multi-provedor**. Você troca o cérebro dele mudando uma variável de ambiente:

```env
AI_PROVIDER=gemini      # gemini | anthropic | openai
```

| Provedor | Modelo padrão | Link | Quando usar |
|---|---|---|---|
| **Gemini** | `gemini-2.0-flash` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | **Gratuito** — recomendado para começar |
| **Anthropic / Claude** | `claude-sonnet-4-6` | [console.anthropic.com](https://console.anthropic.com) | Premium — melhor qualidade de raciocínio |
| **OpenAI GPT** | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com) | Alternativo |

Para trocar: preencha a API key do provedor escolhido no `.env`, defina `AI_PROVIDER` e reinicie. Nenhuma mudança de código.

---

## Setup local

Pré-requisitos: Node.js 20+, Docker, Docker Compose.

```bash
# 1. Dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# preencha DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_USER_ID e a API key do provedor de IA

# 3. Subir Postgres (Docker), esperar ficar pronto e rodar migrations
npm run dev:setup

# 4. Rodar o bot em dev
npm run dev
```

### Infra local

O Postgres roda em container Docker via `infra/compose.yaml`, exposto na **porta 5433** (pra não colidir com um Postgres local ou outro projeto na 5432).

| Script | O que faz |
|---|---|
| `npm run services:up` | Sobe o container `den-den-postgres` em background |
| `npm run services:wait` | Aguarda o Postgres aceitar conexões (usa `pg_isready`) |
| `npm run services:stop` | Para o container sem remover |
| `npm run services:down` | Para e remove o container (volume é preservado) |
| `npm run dev:setup` | Atalho: up + wait + migrate |
| `npm run db:migrate` | Cria/aplica migrations do Prisma |
| `npm run db:studio` | Abre o Prisma Studio pra inspecionar o banco |

---

## Deploy na VPS (Ubuntu 24 + PM2)

Na VPS você pode reaproveitar o mesmo `infra/compose.yaml` — só ajuste a porta no `.env` se quiser expor na 5432, ou mantenha só dentro da rede Docker.

```bash
# Postgres
docker compose -f infra/compose.yaml up -d

# Build
npm run build

# Rodar migrações
npx prisma migrate deploy

# Start com PM2
pm2 start dist/index.js --name den-den
pm2 save
pm2 startup   # gera o script para iniciar no boot
```

Logs: `pm2 logs den-den`
Restart: `pm2 restart den-den`

---

## Comandos Discord

| Comando | O que faz |
|---|---|
| `/today` | Briefing completo do dia: agenda, metas, projetos, foco sugerido |
| `/plan` | Resumo da semana passada e plano da próxima |
| `/status` | Lista suas metas ativas com % de progresso |
| `/delay <days>` | Empurra todos os eventos X dias pra frente |
| `/delay <days> project:<nome>` | Empurra milestones de um projeto específico no GitHub |

### Conversa livre

Além dos comandos, você pode simplesmente mandar mensagens em DM ou mencionar o bot:

- *"amanhã às 10h encontro o Sr. Walter na casa antiga"* → cria evento
- *"quero fazer 30h extras esse mês"* → cria meta
- *"fiz 5h extras hoje"* → registra progresso
- *"estou de férias até domingo, pausa os lembretes"* → define contexto temporário
- *"mudei de emprego, agora sou CTO na Zestify"* → atualiza perfil

---

## Arquitetura

```
den-den/
├── infra/
│   ├── compose.yaml           # Postgres em Docker (porta 5433)
│   └── scripts/
│       └── wait-for-postgres.ts
├── prisma/
│   └── schema.prisma          # PostgreSQL
└── src/
    ├── ai/
    │   ├── provider.ts        # interface comum AIProvider
    │   ├── factory.ts         # cria o provider pelo .env
    │   ├── providers/         # gemini, anthropic, openai
    │   ├── interpreter.ts     # classifica intenção da mensagem
    │   ├── planner.ts         # gera briefings e planos
    │   └── prompts.ts         # system prompts
    ├── bot/                   # Discord (commands, events, intent-handler)
    ├── github/                # wrapper Octokit
    ├── scheduler/             # 4 cron jobs de notificação
    ├── services/              # camada de dados sobre o Prisma
    └── index.ts               # entry point — monta e injeta tudo
```

O `interpreter` e o `planner` recebem o `AIProvider` por injeção — eles não sabem qual provedor estão usando. Trocar de cérebro é só trocar a env var.

---

## Stack

- Node.js + TypeScript
- discord.js v14
- Prisma ORM + PostgreSQL 16 (Docker local na 5433)
- node-cron (jobs proativos)
- Octokit REST (GitHub)
- Gemini / Anthropic / OpenAI SDKs

---

*"Um sonho sem ação é só uma ilusão, nakama. Bora tornar real."* — Den Den 🐚
