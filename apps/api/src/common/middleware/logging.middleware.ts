import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * LoggingMiddleware
 * 
 * Middleware pour logger toutes les requêtes HTTP
 * 
 * Application dans app.module.ts ou main.ts
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    // Log la requête entrante
    this.logger.log(`${method} ${originalUrl} - ${ip}`);

    // Capturer la réponse
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      
      const logLevel = statusCode >= 400 ? 'error' : 'log';
      const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms - ${ip}`;

      if (logLevel === 'error') {
        this.logger.error(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
