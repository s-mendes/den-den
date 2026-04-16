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

4. **Commit convencional** (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `perf:`):
   ```bash
   git commit -m "feat: descrição curta em imperativo"
   ```
   Commits pequenos, escopo único.

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

7. **Commit convencional + PR** contra `main`.

8. **Checklist de QA manual** anexada ao PR, cobrindo golden path e edge cases relevantes:
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

### Dívidas de tooling ainda abertas

- [ ] **commitlint + cz-git** — convenção de commits é manual por enquanto
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
