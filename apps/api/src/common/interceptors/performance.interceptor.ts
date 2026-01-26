import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service';

/**
 * PerformanceInterceptor
 * 
 * Mesure et enregistre les performances des requêtes
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  constructor(
    @Inject(forwardRef(() => MetricsService))
    private readonly metricsService?: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const metricName = `http.${method.toLowerCase()}.${this.normalizePath(url)}`;

          // Enregistrer dans les métriques si disponible
          if (this.metricsService) {
            this.metricsService.recordTiming(metricName, duration);
          }

          // Logger si lent (> 1 seconde)
          if (duration > 1000) {
            this.logger.warn(`Slow request: ${method} ${url} took ${duration}ms`);
          }
        },
        error: () => {
          const duration = Date.now() - startTime;
          if (this.metricsService) {
            const metricName = `http.${method.toLowerCase()}.${this.normalizePath(url)}.error`;
            this.metricsService.recordTiming(metricName, duration);
          }
        },
      }),
    );
  }

  private normalizePath(url: string): string {
    // Remplacer les IDs par :id pour normaliser les métriques
    return url
      .split('/')
      .map((segment) => {
        // Si c'est un CUID ou UUID, remplacer par :id
        if (/^c[a-z0-9]{25}$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
          return ':id';
        }
        return segment;
      })
      .join('.');
  }
}
