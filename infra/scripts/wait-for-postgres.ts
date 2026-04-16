import { exec } from 'node:child_process'

const CONTAINER_NAME = 'den-den-postgres'
const MAX_RETRIES = 30
const RETRY_INTERVAL_MS = 1_000

function check(attempts: number): void {
  exec(`docker exec ${CONTAINER_NAME} pg_isready --host localhost`, (_error, stdout) => {
    if (stdout && stdout.includes('accepting connections')) {
      console.log('\n🟢 Postgres está pronto e aceitando conexões!')
      return
    }

    if (attempts >= MAX_RETRIES) {
      console.error(`\n❌ Postgres não respondeu após ${MAX_RETRIES} tentativas.`)
      process.exit(1)
    }

    process.stdout.write('.')
    setTimeout(() => check(attempts + 1), RETRY_INTERVAL_MS)
  })
}

process.stdout.write('\n🔴 Aguardando Postgres aceitar conexões')
check(0)
