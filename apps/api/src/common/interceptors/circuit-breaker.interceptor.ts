import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CircuitBreaker } from '../utils/circuit-breaker.util';

/**
 * Circuit Breaker Interceptor
 * 
 * Intercepteur pour protéger contre les cascades de défaillances
 * Version BaseVitale Optimisée
 */
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;
    const key = `${className}:${methodName}`;

    let circuitBreaker = this.circuitBreakers.get(key);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 5000,
        resetTimeout: 30000,
      });
      this.circuitBreakers.set(key, circuitBreaker);
    }

    return new Observable((subscriber) => {
      circuitBreaker!
        .execute(() => {
          return new Promise((resolve, reject) => {
            const subscription = next.handle().subscribe({
              next: (value) => {
                resolve(value);
                subscriber.next(value);
              },
              error: (error) => {
                reject(error);
                subscriber.error(error);
              },
              complete: () => {
                subscriber.complete();
              },
            });

            // Cleanup si nécessaire
            // Note: La gestion de la subscription est gérée par RxJS
          });
        })
        .catch((error) => {
          if (error.message === 'Circuit breaker is OPEN') {
            throw new ServiceUnavailableException(
              'Service temporarily unavailable. Please try again later.',
            );
          }
          throw error;
        });
    }).pipe(
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }
}
