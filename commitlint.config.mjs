/**
 * @type {import('cz-git').UserConfig}
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'chore', 'docs', 'test', 'style', 'ci', 'build', 'revert'],
    ],
  },
  prompt: {
    alias: { fd: 'docs: fix typos' },
    messages: {
      type: 'Tipo da mudança:',
      scope: 'Escopo (opcional, ex: ai, bot, infra):',
      customScope: 'Informe o escopo customizado:',
      subject: 'Descrição curta no imperativo:\n',
      body: 'Descrição detalhada (opcional). Use "|" para quebrar linha:\n',
      breaking: 'Lista de BREAKING CHANGES (opcional):\n',
      footerPrefixesSelect: 'Prefixo de footer (opcional):',
      customFooterPrefix: 'Prefixo customizado:',
      footer: 'Issues fechadas (ex: #123, #456):\n',
      generatingByAI: 'Gerando mensagem com IA...',
      generatedSelectByAI: 'Selecione a mensagem gerada:',
      confirmCommit: 'Confirma o commit acima?',
    },
    types: [
      { value: 'feat', name: 'feat:     ✨  Nova funcionalidade', emoji: ':sparkles:' },
      { value: 'fix', name: 'fix:      🐛  Correção de bug', emoji: ':bug:' },
      { value: 'refactor', name: 'refactor: ♻️   Refatoração sem mudança de comportamento', emoji: ':recycle:' },
      { value: 'perf', name: 'perf:     ⚡️  Melhoria de performance', emoji: ':zap:' },
      { value: 'chore', name: 'chore:    🔧  Tarefa de manutenção', emoji: ':wrench:' },
      { value: 'docs', name: 'docs:     📝  Documentação', emoji: ':memo:' },
      { value: 'test', name: 'test:     ✅  Testes', emoji: ':white_check_mark:' },
      { value: 'style', name: 'style:    💄  Formatação/estilo (não afeta código)', emoji: ':lipstick:' },
      { value: 'ci', name: 'ci:       👷  Pipeline de CI/CD', emoji: ':construction_worker:' },
      { value: 'build', name: 'build:    📦️  Build / deps', emoji: ':package:' },
      { value: 'revert', name: 'revert:   ⏪️  Reverter commit anterior', emoji: ':rewind:' },
    ],
    useEmoji: false,
    scopes: ['ai', 'bot', 'scheduler', 'services', 'github', 'infra', 'db', 'deps', 'ci', 'docs'],
    allowCustomScopes: true,
    allowEmptyScopes: true,
    customScopesAlign: 'bottom',
    skipQuestions: ['breaking', 'footerPrefix'],
    maxSubjectLength: 72,
  },
}
