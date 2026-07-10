import { Planner } from '../ai/planner'
import { UserContext } from '../ai/interpreter'

// Estágio 2 da resposta de query: análise do LLM em cima do bloco factual.
// O bloco determinístico SEMPRE aparece; a análise falhar nunca quebra a resposta.
export async function enrichQueryReply(
  planner: Planner,
  question: string,
  dataBlock: string,
  context: UserContext,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  try {
    const analysis = await planner.analyzeQuery(question, dataBlock, context, history)
    if (!analysis.trim()) return dataBlock
    return `${analysis.trim()}\n\n${dataBlock}`
  } catch (err) {
    console.warn('[query-analysis] análise falhou, degradando para resposta determinística:', err)
    return dataBlock
  }
}

// Estágio 2 pós-ação: fato determinístico primeiro (garantido), reflexão depois.
export async function enrichActionReply(
  planner: Planner,
  userMessage: string,
  factLine: string,
  postActionState: string,
  context: UserContext,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  try {
    const reflection = await planner.reflectOnAction(userMessage, factLine, postActionState, context, history)
    if (!reflection.trim()) return factLine
    return `${factLine}\n\n${reflection.trim()}`
  } catch (err) {
    console.warn('[query-analysis] reflexão pós-ação falhou, mantendo só o fato:', err)
    return factLine
  }
}
