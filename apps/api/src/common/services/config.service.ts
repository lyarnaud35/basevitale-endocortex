import { Injectable } from '@nestjs/common';

/**
 * ConfigService centralisé
 * 
 * Accès unifié à toutes les variables d'environnement
 */
@Injectable()
export class ConfigService {
  // Application
  get nodeEnv(): 'development' | 'production' | 'test' {
    return (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  }

  get port(): number {
    return parseInt(process.env.PORT || '3000', 10);
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // Database
  get databaseUrl(): string {
    return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/basevitale';
  }

  // AI Configuration
  get aiMode(): 'MOCK' | 'CLOUD' | 'LOCAL' {
    return (process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL';
  }

  get openaiApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }

  /** CLOUD: 'groq' | 'openai'. Défaut: groq si GROQ_API_KEY, sinon openai. */
  get cloudProvider(): 'groq' | 'openai' {
    const p = (process.env.CLOUD_LLM_PROVIDER || '').toLowerCase();
    if (p === 'groq' || p === 'openai') return p;
    return process.env.GROQ_API_KEY ? 'groq' : 'openai';
  }

  get groqApiKey(): string | undefined {
    return process.env.GROQ_API_KEY;
  }

  /** Base URL pour le provider cloud. Groq = API OpenAI-compatible. */
  get cloudBaseUrl(): string {
    return this.cloudProvider === 'groq'
      ? 'https://api.groq.com/openai/v1'
      : 'https://api.openai.com/v1';
  }

  /** Modèle à utiliser en CLOUD (Groq ou OpenAI). Rapides pour dev UI (< 2s). */
  get cloudModel(): string {
    if (this.cloudProvider === 'groq') {
      return process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    }
    return process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  /** Clé API pour le provider cloud actif. */
  get cloudApiKey(): string | undefined {
    return this.cloudProvider === 'groq' ? this.groqApiKey : this.openaiApiKey;
  }

  get pythonSidecarUrl(): string {
    return process.env.AI_CORTEX_URL || 'http://localhost:8000';
  }

  /**
   * URL du service IA (Python / ai-cortex).
   * Préférence : AI_CORTEX_URL > AI_SERVICE_URL > défaut (host vs Docker).
   * - API dans Docker (même réseau que ai-cortex) → AI_CORTEX_URL=http://ai-cortex:8000
   * - API sur hôte (nx serve) → AI_CORTEX_URL=http://localhost:8000
   */
  get aiServiceUrl(): string {
    if (process.env.AI_CORTEX_URL) return process.env.AI_CORTEX_URL;
    if (process.env.AI_SERVICE_URL) return process.env.AI_SERVICE_URL;
    return this.isDevelopment ? 'http://localhost:8000' : 'http://ai-cortex:8000';
  }

  /** Timeout HTTP (ms) pour les appels au sidecar Python (IA locale). Défaut: 300s (inférence CPU). */
  get aiCortexTimeoutMs(): number {
    const v = parseInt(process.env.AI_CORTEX_TIMEOUT_MS || '300000', 10);
    return Number.isNaN(v) || v < 1000 ? 300_000 : v;
  }

  get ollamaBaseUrl(): string {
    return process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  }

  get ollamaModel(): string {
    return process.env.OLLAMA_MODEL || 'llama2';
  }

  // Security
  get jwtSecret(): string | undefined {
    return process.env.JWT_SECRET;
  }

  get corsOrigin(): string {
    return process.env.CORS_ORIGIN || '*';
  }

  // Rate Limiting
  get rateLimitWindow(): number {
    return parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  }

  get rateLimitMax(): number {
    return parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
  }

  // Cache
  get cacheEnabled(): boolean {
    return process.env.ENABLE_CACHE !== 'false';
  }

  get cacheTtl(): number {
    return parseInt(process.env.CACHE_TTL_MS || '300000', 10); // 5 minutes
  }

  // Timeout
  get requestTimeout(): number {
    return parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10); // 30 secondes
  }

  // Logging
  get logLevel(): ('error' | 'warn' | 'log' | 'debug' | 'verbose')[] {
    if (this.isProduction) {
      return ['error', 'warn', 'log'];
    }
    return ['error', 'warn', 'log', 'debug', 'verbose'];
  }

  // Feature Flags
  get enableSwagger(): boolean {
    return process.env.ENABLE_SWAGGER !== 'false';
  }

  get enableMetrics(): boolean {
    return process.env.ENABLE_METRICS !== 'false';
  }
}
