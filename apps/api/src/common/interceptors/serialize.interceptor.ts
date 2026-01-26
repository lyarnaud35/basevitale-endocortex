import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * SerializeInterceptor
 * 
 * Sérialise les réponses en excluant les propriétés sensibles
 * 
 * Usage: Décorer les classes avec @Exclude() sur les propriétés sensibles
 */
@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Exclure les propriétés sensibles si nécessaire
        if (data && typeof data === 'object') {
          return this.sanitizeResponse(data);
        }
        return data;
      }),
    );
  }

  private sanitizeResponse(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeResponse(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      
      for (const key in data) {
        // Exclure les propriétés sensibles
        if (!['password', 'token', 'secret', 'apiKey'].includes(key)) {
          sanitized[key] = this.sanitizeResponse(data[key]);
        }
      }
      
      return sanitized;
    }

    return data;
  }
}
