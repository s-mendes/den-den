// Matcher genérico de título para casar o texto extraído pelo LLM com registros
// reais (metas, tarefas). Função pura — não toca no banco.

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function significantWords(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((w) => w.length > 3)
}

export function pickBestByTitle<T>(items: T[], getTitle: (item: T) => string, query: string): T | null {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return null

  let best: T | null = null
  let bestScore = 0

  for (const item of items) {
    const title = normalize(getTitle(item))

    if (title === normalizedQuery) return item

    let score = 0
    // Containment integral (em qualquer direção) vale mais que sobreposição parcial
    if (title.includes(normalizedQuery) || normalizedQuery.includes(title)) {
      score += 10
    }

    const titleWords = new Set(significantWords(getTitle(item)))
    for (const word of significantWords(query)) {
      if (titleWords.has(word)) score++
    }

    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }

  return bestScore > 0 ? best : null
}
