import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const LOCK_KEY = 'lock:gpu:1';
const DEFAULT_TTL_SECONDS = 120;
const DEFAULT_MAX_WAIT_MS = 60_000;
const RETRY_INTERVAL_MS = 1_000;

/**
 * GpuLockService - Sémaphore GPU
 *
 * Verrou Redis (SET NX EX) pour réguler les appels concurrents vers l'IA.
 * Évite la saturation des ressources en mode LOCAL (Ollama / LLM local).
 *
 * Usage : runWithLock(() => appelPython()) dans un bloc try/finally implicite.
 */
@Injectable()
export class GpuLockService implements OnModuleDestroy {
  private readonly logger = new Logger(GpuLockService.name);
  private readonly redis: Redis;
  private readonly ttlSeconds: number;
  private readonly maxWaitMs: number;

  constructor() {
    let host = process.env.REDIS_HOST || 'localhost';
    if (host === 'redis' && process.env.NODE_ENV === 'development') {
      host = 'localhost';
    }
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;
    this.ttlSeconds = parseInt(process.env.GPU_LOCK_TTL_SECONDS || String(DEFAULT_TTL_SECONDS), 10) || DEFAULT_TTL_SECONDS;
    this.maxWaitMs = parseInt(process.env.GPU_LOCK_MAX_WAIT_MS || String(DEFAULT_MAX_WAIT_MS), 10) || DEFAULT_MAX_WAIT_MS;

    this.redis = new Redis({
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => (times <= 3 ? 500 : null),
    });

    this.redis.on('error', (err) => {
      this.logger.warn('GPU lock Redis error', err instanceof Error ? err.message : String(err));
    });

    this.logger.log(
      `GpuLockService initialized (ttl=${this.ttlSeconds}s, maxWait=${this.maxWaitMs}ms)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }

  /**
   * Vérifier que Redis (sémaphore GPU) est joignable.
   * Utile pour health checks (ex. /scribe/health).
   */
  async ping(): Promise<{ ok: boolean; latencyMs?: number }> {
    const start = Date.now();
    try {
      const pong = await this.redis.ping();
      const latencyMs = Date.now() - start;
      return { ok: pong === 'PONG', latencyMs };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Acquérir le verrou (SET key EX ttl NX).
   * @returns true si acquis, false sinon
   */
  async acquireLock(ttlSeconds?: number): Promise<boolean> {
    const ttl = ttlSeconds ?? this.ttlSeconds;
    const result = await this.redis.set(LOCK_KEY, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * Libérer le verrou (DEL key).
   * À appeler uniquement si acquireLock a retourné true.
   */
  async releaseLock(): Promise<void> {
    await this.redis.del(LOCK_KEY);
  }

  /**
   * Exécuter une fn en tenant le verrou GPU.
   * Acquiert le verrou (avec retries), exécute fn, libère dans finally.
   *
   * @param fn - Fonction async à exécuter sous le verrou
   * @param options - ttlSeconds, maxWaitMs optionnels
   * @throws Si le verrou n'a pas pu être acquis après maxWaitMs
   */
  async runWithLock<T>(
    fn: () => Promise<T>,
    options?: { ttlSeconds?: number; maxWaitMs?: number },
  ): Promise<T> {
    const ttl = options?.ttlSeconds ?? this.ttlSeconds;
    const maxWait = options?.maxWaitMs ?? this.maxWaitMs;
    const deadline = Date.now() + maxWait;
    let acquired = false;

    try {
      while (Date.now() < deadline) {
        acquired = await this.acquireLock(ttl);
        if (acquired) {
          this.logger.debug('GPU lock acquired');
          return await fn();
        }
        await this.sleep(RETRY_INTERVAL_MS);
      }

      throw new Error(
        `GPU lock: could not acquire lock within ${maxWait}ms (TTL=${ttl}s). ` +
          'Another IA job is likely running.',
      );
    } finally {
      if (acquired) {
        await this.releaseLock();
        this.logger.debug('GPU lock released');
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
