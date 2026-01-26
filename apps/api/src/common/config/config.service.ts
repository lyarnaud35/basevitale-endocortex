import { Injectable } from '@nestjs/common';

/**
 * ConfigService
 * 
 * Service centralisé pour la configuration de l'application
 */
@Injectable()
export class ConfigService {
  // AI Configuration
  get aiMode(): 'MOCK' | 'CLOUD' | 'LOCAL' {
    return (process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL';
  }

  get openaiApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }

  get pythonSidecarUrl(): string {
    return process.env.AI_CORTEX_URL || 'http://localhost:8000';
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

  // Database Configuration
  get databaseUrl(): string {
    return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/basevitale';
  }

  // API Configuration
  get port(): number {
    return parseInt(process.env.PORT || '3000', 10);
  }

  get corsOrigin(): string {
    return process.env.CORS_ORIGIN || '*';
  }

  get nodeEnv(): 'development' | 'production' | 'test' {
    return (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // Feature Flags
  get enableCache(): boolean {
    return process.env.ENABLE_CACHE !== 'false';
  }

  get enableSwagger(): boolean {
    return process.env.ENABLE_SWAGGER !== 'false';
  }

  // Logging
  get logLevel(): string[] {
    if (this.isProduction) {
      return ['error', 'warn', 'log'];
    }
    return ['error', 'warn', 'log', 'debug', 'verbose'];
  }
}
