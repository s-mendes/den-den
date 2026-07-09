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

### Google Calendar Integration

O Den Den se conecta à API do Google Calendar para ler a agenda real e planejar blocos livres. Para configurar:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto e ative a **Google Calendar API**.
3. Em **OAuth Consent Screen**, configure o app como *External* e adicione o seu e-mail como *Test User*.
4. Vá em **Credentials**, crie uma **OAuth client ID** (tipo *Web application* ou *Desktop app*).
5. Adicione `https://developers.google.com/oauthplayground` às URIs de redirecionamento autorizadas (se usar Web).
6. Obtenha o seu `refresh_token` utilizando o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground):
   - Escopo para selecionar: `https://www.googleapis.com/auth/calendar.readonly`.
7. Preencha os campos `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` e `GOOGLE_CALENDAR_ID` no seu arquivo `.env`.

> 💡 **Graceful Fallback:** Caso as credenciais do Google Calendar não estejam configuradas, o Den Den iniciará normalmente em modo degradado sem ler a agenda.

---

## Deploy na VPS via Docker + GitHub Actions

O deploy de produção não faz build na VPS. O fluxo é:

1. Push na `main`.
2. O workflow `CI` roda typecheck, lint e testes.
3. Se o `CI` passar, o workflow `CD` builda a imagem no GitHub Actions.
4. A imagem é publicada no GitHub Container Registry (`ghcr.io`).
5. A VPS acessa via SSH, puxa a imagem pronta, roda migrations e reinicia o container.

### Setup da VPS

Pré-requisitos na VPS: Docker com Compose v2, um usuário com permissão para rodar `docker` e a network externa `apps-network` já conectada ao Postgres compartilhado.

Crie o diretório de deploy e o `.env` de produção:

```bash
ssh usuario@IP_DA_VPS 'mkdir -p ~/den-den'
scp infra/.env.production.example usuario@IP_DA_VPS:~/den-den/.env
ssh usuario@IP_DA_VPS 'nano ~/den-den/.env'
```

O compose de produção não sobe Postgres próprio. Ele conecta o app na network externa `apps-network`, então o `.env` da VPS deve usar como host o nome do container ou alias DNS do Postgres nessa rede:

```env
DATABASE_URL=postgresql://den_den:SENHA_FORTE@postgres:5432/den_den?schema=public
```

Se a network ainda não existir ou o Postgres ainda não estiver conectado nela:

```bash
docker network create apps-network
docker network connect apps-network NOME_DO_CONTAINER_POSTGRES
```

### Secrets no GitHub

Configure em `Settings > Secrets and variables > Actions`:

| Nome | Tipo | Obrigatório | Valor |
|---|---|---:|---|
| `VPS_HOST` | Secret | Sim | IP ou hostname da VPS |
| `VPS_USER` | Secret | Sim | usuário SSH |
| `VPS_SSH_PRIVATE_KEY` | Secret | Sim | chave privada SSH para acessar a VPS |
| `VPS_SSH_PORT` | Secret | Não | porta SSH, padrão `22` |
| `VPS_DEPLOY_PATH` | Variable | Não | diretório remoto, padrão `den-den` |

O workflow usa o `GITHUB_TOKEN` para publicar e puxar a imagem do GHCR durante o deploy.

### Operação

Depois do primeiro setup, basta fazer merge/push na `main`. Para rodar manualmente, use o workflow `CD` em `Actions > CD > Run workflow`.

Logs na VPS:

```bash
docker logs -f den-den-app
```

Status/restart manual:

```bash
cd ~/den-den
docker compose --env-file .env -f compose.yaml ps
docker compose --env-file .env -f compose.yaml restart app
```

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
