# Den Den — Guia de Colaboração

Projeto: bot Discord secretário pessoal de vida. Referência cultural: Den Den Mushi (One Piece).
Stack: Node.js + TypeScript, discord.js v14, Prisma + PostgreSQL (Docker local na 5433), node-cron, multi-provedor de IA (Gemini / Anthropic / OpenAI).

---

## Workflow obrigatório para toda mudança

**Nenhuma exceção.** `main` é protegida — nunca commite direto nela.

1. **Saia do `main` antes de qualquer modificação**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/descricao   # ou fix/, refactor/, chore/, docs/
   ```

2. **Faça as mudanças seguindo TDD** — obrigatório:
   - escreva/ajuste testes primeiro (vermelho),
   - implemente a solução,
   - valide os testes novos/afetados (verde).

3. **Qualidade de código** antes de commitar (todos os comandos devem passar limpos):
   ```bash
   npm run typecheck       # tsc --noEmit
   npm run lint:fix        # ESLint com --fix
   npm run lint            # deve retornar zero erros
   npm test                # suíte completa (Vitest)
   ```

4. **Commit convencional** via `npm run commit` (cz-git guiado em PT-BR) ou manual:
   ```bash
   npm run commit                                # prompt interativo
   git commit -m "feat: descrição em imperativo" # manual
   ```
   Tipos aceitos: `feat`, `fix`, `refactor`, `perf`, `chore`, `docs`, `test`, `style`, `ci`, `build`, `revert`.
   Commits pequenos, escopo único. O hook `commit-msg` valida via `commitlint`; o `pre-commit` roda `typecheck + lint + test` automaticamente.

5. **Push e PR** contra `main`. Merge apenas após revisão aprovada.

---

## Playbook de entrega de feature

Para iniciar uma próxima issue sem herdar contexto da anterior:

1. **Atualize base local e limpe branches antigas**:
   ```bash
   git checkout main
   git pull origin main
   git branch -d feat/branch-anterior   # só se já foi mergeada
   ```

2. **Crie a branch da issue**:
   ```bash
   git checkout -b feat/issue-xxx-descricao
   ```

3. **Planeje o escopo antes de codar**: arquivos afetados, critérios da issue, checklist de validação manual.

4. **TDD obrigatório**: testes vermelhos → implementação → verdes.

5. **Suba a infra local** se o escopo toca no banco:
   ```bash
   npm run dev:setup   # up + wait-for-postgres + migrate
   ```
   Como já expomos o Postgres na **5433** (para não colidir com outros projetos rodando na 5432), não existe o "swap temporário de porta" do la-biblio-tour aqui.

6. **Qualidade** antes do commit: type-check, lint, testes. Ver seção acima.

7. **Commit convencional + PR** contra `main`:
   - Utilize o template padrão do GitHub localizado em `.github/pull_request_template.md`.
   - Adicione palavras-chave como `Closes #X` ou `Fixes #X` para fechar automaticamente as issues relacionadas ao realizar o merge do PR.
   - Forneça uma checklist de testes de QA manual detalhando o Golden Path (fluxo principal) e Edge Cases (casos de erro) validados.
   
8. **Checklist padrão de QA manual** no PR (conforme o template):
   - Mensagem em DM é interpretada corretamente?
   - Intent errado cai em `chitchat` e pede esclarecimento?
   - Slash command deferido retorna resposta antes do timeout do Discord (3s)?
   - Notificação cron dispara pro `DISCORD_USER_ID` correto?


---

## Ferramentas de qualidade configuradas

- **TypeScript strict** — `npm run typecheck` (via `tsc --noEmit`)
- **ESLint 9 flat config** com `typescript-eslint` + integração `eslint-config-prettier` — `npm run lint` / `npm run lint:fix`
- **Prettier** — `npm run format` / `npm run format:check`
- **Vitest** — `npm test` / `npm run test:watch` / `npm run test:ui`
- **Zod** — toda entrada externa (resposta de LLM, payload de serviço) passa por schema Zod em `src/ai/schemas.ts`. Os `services` expõem tipos de input derivados desses schemas via `z.infer`.
- **commitlint** com `@commitlint/config-conventional` — valida mensagens via hook `commit-msg`
- **cz-git** — prompt interativo em PT-BR via `npm run commit` (`commitlint.config.mjs` define types e scopes)
- **husky 9** — instala hooks via `npm install` (script `prepare`):
  - `pre-commit`: roda `typecheck + lint + test` (bloqueia commit em red)
  - `commit-msg`: roda `commitlint` (bloqueia mensagem fora do padrão)

### Tooling de CI/CD

- **CI (GitHub Actions)** — `.github/workflows/ci.yml` roda typecheck + lint + test a cada PR
- **CD (GitHub Actions)** — `.github/workflows/cd.yml` faz build/push GHCR e deploy SSH na VPS (com `prisma migrate deploy`)
- **Proteção de `main`** — exige PR com o status check "Typecheck, lint e testes" verde

---

## Convenções de código

- **Idioma**: comentários, commits e mensagens do bot em PT-BR por padrão. O bot em runtime responde na língua que o usuário usa (contrato da personalidade).
- **Injeção de dependência em IA**: `Interpreter` e `Planner` **nunca** instanciam SDK direto. Sempre recebem `AIProvider` via construtor. Trocar de cérebro é só mudar `AI_PROVIDER` no `.env`.
- **Prompts**: centralizar em `src/ai/prompts.ts`. Não espalhar strings de system prompt pelo código.
- **Validação com Zod**: toda resposta de LLM e todo payload externo passa por schema em `src/ai/schemas.ts`. O tipo `Intent` é `z.infer<typeof intentSchema>` — nunca escreva manualmente.
- **Services**: toda chamada Prisma passa por `src/services/*.service.ts`. Handlers de bot/scheduler não chamam `prisma` direto.
- **Secrets**: nada de chave em código. Tudo via `.env` + `.env.example` documentado.
- **Datas**: sempre armazenar em UTC no banco. Formatar para fuso local só na camada de apresentação (bot).
- **Testes**: arquivo `.test.ts` colado ao arquivo testado (mesma pasta). Mockar dependências externas (LLM, Prisma) — testes unitários não devem tocar no banco real.

---

## Regras de Produto

**Regra fundamental:** O Den Den não deve maximizar produtividade. Ele deve maximizar **consistência sem burnout**.

Visão do projeto:

> Den Den é um secretário pessoal que cruza agenda, energia, metas e projetos para decidir o que você deve fazer hoje — **e o que você deve ignorar.**

Heurísticas que devem guiar toda decisão de produto:

1. Nunca sugira "programar mais" em um dia com >8h de trabalho
2. Se o usuário não treinou há >3 dias, priorize saúde acima de side projects
3. Sempre diga o que IGNORAR hoje — tão importante quanto o que fazer
4. 2 noites livres por semana são sagradas, não negociáveis
5. Semana de 70% das metas é excelente. 100% toda semana é burnout
6. Quando o usuário falhar um bloco, redistribua — não culpe
7. Detecte padrões de sobrecarga e alerte ANTES do burnout

---

## Gestão de Projeto no GitHub

O projeto é organizado em **milestones** (sprints) com **issues** detalhadas.

### Convenções de Milestones

Cada milestone representa uma sprint/fase do roadmap com escopo fechado:

| Milestone | Objetivo |
|---|---|
| Sprint 1 — Den Den Útil de Verdade | Áreas da vida, Google Calendar, metas semanais, /today inteligente |
| Sprint 2 — Den Den Gerente de Projetos | GitHub Issues, task selector, /focus, /done |
| Sprint 3 — Den Den Criador de Conteúdo | Pipeline de vídeos, comandos /video |
| Sprint 4 — Den Den Agente Autônomo | Replanejamento automático, burnout detector, modos operacionais |

### Convenções de Issues

Cada issue segue este template:
- **Título**: `feat: descrição clara da entrega` (commitlint-friendly)
- **Labels**: `fase:N` + `area:X` + `prioridade:Y` + `enhancement`
- **Milestone**: sprint correspondente
- **Body**: Objetivo → Contexto → Plano de Implementação (com código) → Critérios de Aceite (checklist) → Arquivos Afetados → Dependências

### Labels disponíveis

| Label | Uso |
|---|---|
| `fase:1` a `fase:4` | Sprint/fase do roadmap |
| `area:model` | Mudanças em Prisma schema |
| `area:integration` | Integrações externas (Google Calendar, GitHub) |
| `area:ai` | IA/LLM — prompts, planner, interpreter |
| `area:bot` | Discord bot — commands, events |
| `area:scheduler` | Cron jobs e notificações proativas |
| `prioridade:critica` | Essencial para a fase funcionar |
| `prioridade:alta` | Importante mas não bloqueante |
| `prioridade:media` | Desejável, pode esperar |
| `produto` | Regra de produto / visão / filosofia |

### Áreas da vida do usuário

O Den Den organiza a vida do usuário em 6 áreas:

| Área | Slug | Exemplos |
|---|---|---|
| Trabalho fixo | `work` | Macle Sistemas |
| Negócios | `business` | Zestify, Excursa |
| Conteúdo | `content` | Retro Play Archive |
| Saúde | `health` | Treino, atividade física |
| Pessoal | `personal` | Descanso, lazer, relacionamento |
| Estudo | `study` | Cursos, livros, pesquisa |

---

## Referências úteis

- `README.md` — setup, scripts e arquitetura para onboarding
- `.env.example` — fonte da verdade de variáveis necessárias
- `infra/compose.yaml` — Postgres local (porta 5433)
- `prisma/schema.prisma` — modelo de dados
- [GitHub Milestones](https://github.com/s-mendes/den-den/milestones) — roadmap com sprints e issues
