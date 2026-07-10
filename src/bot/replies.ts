// Respostas determinísticas do Den Den para resultados de ação.
// Funções puras: recebem dados prontos, nunca tocam no banco.

export function goalNotFound(title: string, activeTitles: string[]): string {
  if (activeTitles.length === 0) {
    return `Gururururu... não encontrei a meta *${title}* — na verdade, você não tem nenhuma meta ativa registrada por aqui, capitão. Quer criar uma?`
  }
  const list = activeTitles.map((t) => `• ${t}`).join('\n')
  return `Gururururu... não encontrei nenhuma meta chamada *${title}*, capitão. As metas ativas no meu registro são:\n${list}\nQual delas você quis dizer?`
}

export function goalCompleted(
  title: string,
  progress?: { currentValue: number; targetValue?: number | null; unit?: string | null }
): string {
  const progressStr =
    progress?.targetValue != null
      ? ` Fechou em ${progress.currentValue}/${progress.targetValue}${progress.unit ? ` ${progress.unit}` : ''}.`
      : ''
  return `🎯 Meta *${title}* concluída, capitão!${progressStr} Mais um tesouro no baú — orgulho de nakama!`
}

export function projectNotFound(name?: string): string {
  if (!name) {
    return 'Kachak! Preciso saber qual projeto você quer ajustar, capitão. Me diz o nome dele?'
  }
  return `Kachak! Não encontrei nenhum projeto chamado *${name}* no meu registro, capitão. Nada foi alterado. Confere o nome pra mim?`
}

export function projectWithoutGithub(name: string): string {
  return `O projeto *${name}* existe, mas não tem repositório GitHub vinculado — então não consigo mexer nos milestones dele, capitão. Nada foi alterado.`
}

export function nightlyNothingLogged(): string {
  return 'Anotei seu relato, capitão, mas nenhuma das atividades bateu com uma meta semanal ativa — então nada foi registrado no progresso. Se quiser, crie metas semanais pra essas áreas!'
}
