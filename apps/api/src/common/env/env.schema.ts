import { z } from 'zod';

/**
 * GHOST PROTOCOL - Validation des variables d'environnement (Zod).
 * Le démarrage de l'API échoue si XAI_API_KEY est absente ou invalide.
 * Pivot xAI (Grok) : toute référence à GROQ est supprimée.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().min(1).max(65535)).default('3000'),

  /** Clé API xAI (Grok) — OBLIGATOIRE. L'app ne démarre pas sans elle. */
  XAI_API_KEY: z.string().min(1, 'XAI_API_KEY est requise (non vide)'),

  /** Mode IA : MOCK | CLOUD | LOCAL */
  AI_MODE: z.enum(['MOCK', 'CLOUD', 'LOCAL']).default('MOCK'),

  /** Modèle xAI (ex: grok-2, grok-2-mini). Défaut grok-2-mini pour dev. */
  XAI_MODEL: z.string().min(1).default('grok-2-mini'),

  /** Oracle (PatientContextMachine) : MOCK = données fictives, LIVE = appel Gemini. Défaut MOCK. */
  ORACLE_MODE: z.enum(['MOCK', 'LIVE']).default('MOCK'),

  /** Gemini (Oracle LIVE) : clé API Google AI. Requise si ORACLE_MODE=LIVE. */
  GEMINI_API_KEY: z.string().min(1).optional(),
  /** Modèle Gemini (ex: gemini-1.5-flash, gemini-1.5-pro). Défaut gemini-1.5-flash. */
  GEMINI_MODEL: z.string().min(1).optional(),

  /** URL du sidecar Python (AI Cortex) — utilisé quand AI_MODE=LOCAL */
  AI_CORTEX_URL: z.string().url().optional(),
  AI_SERVICE_URL: z.string().url().optional(),
  AI_CORTEX_TIMEOUT_MS: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().min(1000)).optional(),

  DATABASE_URL: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  INTERNAL_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),
  ENABLE_CACHE: z.string().optional(),
  CACHE_TTL_MS: z.string().optional(),
  REQUEST_TIMEOUT_MS: z.string().optional(),
  ENABLE_SWAGGER: z.string().optional(),
  ENABLE_METRICS: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional(),
  OLLAMA_MODEL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valide process.env au chargement.
 * Lance si XAI_API_KEY manquante ou invalide.
 */
export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`[Env] Validation échouée: ${msg}`);
  }
  return parsed.data;
}
