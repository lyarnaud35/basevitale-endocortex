import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { creationRateLimiter } from '../utils/rate-limit.util';

/**
 * ThrottleGuard
 * 
 * Garde pour limiter les requêtes de création (plus restrictif)
 * 
 * Utilise un rate limiter séparé avec 10 requêtes/minute
 * 
 * @example
 * @UseGuards(ThrottleGuard)
 * @Post('patients')
 * async createPatient() { ... }
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const key = `throttle:${ip}`;

    if (creationRateLimiter.isLimited(key)) {
      const resetTime = Math.ceil(
        creationRateLimiter.getResetTime(key) / 1000,
      );

      throw new HttpException(
        {
          message: 'Too many creation requests, please try again later',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter: resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
