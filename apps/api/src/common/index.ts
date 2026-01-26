/**
 * Common - Exports centralisés
 * 
 * Exporte tous les utilitaires, decorators, interceptors, etc.
 */

// Decorators
export * from './decorators/current-user.decorator';
export * from './decorators/current-user-id.decorator';
export * from './decorators/public.decorator';
export * from './decorators/validate-body.decorator';

// Interceptors
export * from './interceptors/transform.interceptor';

// Pipes
export * from './pipes/zod-validation.pipe';

// Filters
export * from './filters/http-exception.filter';

// Middleware
export * from './middleware/logging.middleware';

// Guards
export * from './guards/auth.guard';

// DTOs
export * from './dto/api-response.dto';

// Services
export * from './services/logger.service';

// Constants
export * from './constants/api.constants';

// Helpers
export * from './helpers/knowledge-graph.helper';
export * from './helpers/date.helper';
export * from './helpers/error.helper';

// Validators
export * from './validators/cuid.validator';
export * from './validators/ins-token.validator';

// Custom Decorators
export * from './decorators/validate-cuid.decorator';
export * from './decorators/validate-ins-token.decorator';
export * from './decorators/request-id.decorator';
export * from './decorators/pagination.decorator';
export * from './decorators/roles.decorator';

// Middleware
export * from './middleware/request-id.middleware';

// Utils
export * from './utils/uuid.util';
export * from './utils/pagination.util';
export * from './utils/sanitize.util';
export * from './utils/rate-limit.util';
export * from './utils/prisma.helper';
export * from './utils/validation.helper';

// Interceptors
export * from './interceptors/logging.interceptor';
export * from './interceptors/timeout.interceptor';
export * from './interceptors/transform-response.interceptor';
export * from './interceptors/cache.interceptor';

// Guards
export * from './guards/role.guard';

// Filters
export * from './filters/database-exception.filter';
export * from './filters/global-exception.filter';

// Middleware
export * from './middleware/compression.middleware';
export * from './middleware/rate-limit.middleware';
export * from './middleware/security.middleware';

// Services
export * from './services/cache.service';
export * from './services/metrics.service';
export * from './services/config.service';

// Utils supplémentaires
export * from './utils/performance.util';
export * from './utils/string.util';
// Note: chunk est exporté depuis array.util, éviter conflit avec batch.util
export { chunk } from './utils/array.util';
export * from './utils/circuit-breaker.util';
export * from './utils/health-check.util';
// Note: retryWithBackoff est exporté depuis retry.util, éviter conflit avec delay.util
export { retryWithBackoff, retryWithCondition } from './utils/retry.util';
export type { RetryOptions } from './utils/retry.util';

// Interceptors supplémentaires
export * from './interceptors/performance.interceptor';
export * from './interceptors/circuit-breaker.interceptor';
export * from './interceptors/cache-response.interceptor';

// Guards supplémentaires
export * from './guards/throttle.guard';

// Pipes
export * from './pipes/validation.pipe';

// Decorators supplémentaires
// Note: api-docs désactivé car @nestjs/swagger non installé
// export * from './decorators/api-docs.decorator';
// Note: RetryOptions peut être en conflit avec retry.util.ts, exporter uniquement la fonction
export { Retry } from './decorators/retry.decorator';
export * from './decorators/log-execution.decorator';
export * from './decorators/file-upload.decorator';
export * from './decorators/parse-int.decorator';
export * from './decorators/cache-response.decorator';

// Utils supplémentaires
// Note: formatDate est exporté depuis date.helper, éviter conflit avec format.util
export { formatCurrency, formatDateTime } from './utils/format.util';
export * from './utils/env.util';
export * from './utils/logger.util';
export * from './utils/transform.util';
export * from './utils/file.util';
export * from './utils/query.util';
export * from './utils/batch-optimizer.util';
export * from './utils/cache.helper';
export * from './utils/memory-cache.util';
export * from './utils/response.helper';
export * from './utils/context.util';
export * from './utils/type.util';
export * from './utils/deep-merge.util';
// Note: delay.util a aussi retryWithBackoff mais on exporte depuis retry.util
export { delay, delayMs } from './utils/delay.util';
// Note: batch.util exporte processBatch et chunk mais on exporte chunk depuis array.util
export { processBatch, processBatchParallel } from './utils/batch.util';
export * from './utils/slug.util';
export * from './utils/number.util';
export * from './utils/object.util';

// Middleware supplémentaires
export * from './middleware/helmet.middleware';

// Services
export * from './services/health.service';
export * from './services/rate-limiter.service';
