import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { globalRateLimiter } from '../utils/rate-limit.util';

/**
 * RateLimitMiddleware
 * 
 * Limite le nombre de requêtes par IP
 * 
 * Configuration : 100 requêtes par minute par défaut
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `rate_limit:${ip}`;

    if (globalRateLimiter.isLimited(key)) {
      const resetTime = Math.ceil(
        globalRateLimiter.getResetTime(key) / 1000,
      );
      
      res.setHeader('X-RateLimit-Limit', '100');
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', resetTime.toString());
      
      throw new HttpException(
        {
          message: 'Too many requests, please try again later',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter: resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const remaining = globalRateLimiter.getRemaining(key);
    const resetTime = Math.ceil(globalRateLimiter.getResetTime(key) / 1000);

    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    next();
  }
}
