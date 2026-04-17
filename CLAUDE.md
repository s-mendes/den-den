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

4. **Code review com Copilot** antes do commit. Rode o CLI do GitHub Copilot passando contexto completo e peça análise somente-leitura das alterações ainda não commitadas:
   ```bash
   copilot -p "Faça um code review das mudanças não commitadas. Use 'git diff HEAD' e 'git status' para ver o escopo, leia os arquivos conforme necessário. NÃO EDITE nada, apenas analise.

   Contexto: <resuma a feature/fix — issue, objetivo, arquivos tocados, decisões não óbvias>.

   Avalie:
   1. Bugs latentes, race conditions, regressões (especialmente em handlers assíncronos do discord.js e jobs do node-cron)
   2. Padrões do projeto (CLAUDE.md: injeção de dependência de AIProvider, prompts centralizados em src/ai/prompts.ts, validação Zod em src/ai/schemas.ts, Prisma somente via src/services/*.service.ts, datas em UTC no banco)
   3. Cobertura de testes (Vitest) — novos casos cobrem golden path e edge cases? Mocks de LLM/Prisma estão corretos?
   4. Segurança e secrets — nada de chave em código, entradas externas passam por Zod, comandos slash deferidos respeitam o timeout de 3s do Discord
   5. Callers/consumidores que possam ter escapado da refatoração (grep por símbolos renomeados/removidos)

   Formato: lista numerada, cada item com severidade [CRITICAL|HIGH|MEDIUM|LOW|NIT], arquivo:linha, descrição e sugestão concreta. Se não houver problemas em algum tópico, diga explicitamente. Seja sucinto e direto." --allow-all-tools
   ```
   Aplique os achados relevantes antes de seguir. Itens `NIT` podem virar follow-up; `CRITICAL`/`HIGH` bloqueiam o commit.

5. **Commit convencional** via `npm run commit` (cz-git guiado em PT-BR) ou manual:
   ```bash
   npm run commit                                # prompt interativo
   git commit -m "feat: descrição em imperativo" # manual
   ```
   Tipos aceitos: `feat`, `fix`, `refactor`, `perf`, `chore`, `docs`, `test`, `style`, `ci`, `build`, `revert`.
   Commits pequenos, escopo único. O hook `commit-msg` valida via `commitlint`; o `pre-commit` roda `typecheck + lint + test` automaticamente.

6. **Push e PR** contra `main`. Merge apenas após revisão aprovada.

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

7. **Code review com Copilot** (`copilot -p "..." --allow-all-tools`) passando contexto da issue — ver prompt completo no passo 4 do "Workflow obrigatório". Trate `CRITICAL`/`HIGH` antes de commitar.

8. **Commit convencional + PR** contra `main`.

9. **Checklist de QA manual** anexada ao PR, cobrindo golden path e edge cases relevantes:
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

### Dívidas de tooling ainda abertas

- [ ] **Proteção de `main`** no GitHub — exigir PR e status checks
- [ ] **CI (GitHub Actions)** — rodar typecheck + lint + test a cada PR

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

## Referências úteis

- `README.md` — setup, scripts e arquitetura para onboarding
- `.env.example` — fonte da verdade de variáveis necessárias
- `infra/compose.yaml` — Postgres local (porta 5433)
- `prisma/schema.prisma` — modelo de dados
