/**
 * Limit the total amount of time a request can spend waiting for multiple
 * sequential LLM providers. The timed-out task may finish later, but the route
 * must never persist its result after this promise has rejected.
 */
export class AiGenerationTimeoutError extends Error {
  constructor() {
    super('La génération IA a dépassé le délai autorisé. Réessayez ou vérifiez les fournisseurs IA configurés.')
    this.name = 'AiGenerationTimeoutError'
  }
}

export async function withAiGenerationDeadline<T>(task: Promise<T>, timeoutMs = 45_000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new AiGenerationTimeoutError()), timeoutMs)
      }),
    ])
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}
