/**
 * GHOST PROTOCOL - Abstraction du fournisseur LLM.
 * Permet d'injecter xAI (Grok) ou un autre provider sans coupler le domaine.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  /** Optionnel : température, max_tokens, etc. */
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  /** Usage tokens si disponible */
  usage?: { prompt: number; completion: number };
}

/**
 * Interface du fournisseur LLM (xAI, OpenAI-compatible, etc.).
 * L'implémentation concrète (XaiLLMService) utilise le SDK OpenAI avec baseURL xAI.
 */
export interface LLMProvider {
  /**
   * Génère une réponse à partir des messages.
   * Non implémenté en S1 : stub uniquement.
   */
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResult>;

  /** Identifiant du provider (ex: 'xai'). */
  readonly providerId: string;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
