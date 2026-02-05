import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ConfigService } from '../services/config.service';

const HEADER_API_KEY = 'x-internal-api-key';

/**
 * ApiKeyGuard – Authentification par clé API pour consommation backend-to-backend.
 * Vérifie le header X-INTERNAL-API-KEY contre INTERNAL_API_KEY.
 * Les routes marquées @Public() ne sont pas protégées.
 * En cas d'échec : 403 Forbidden.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const expectedKey = this.config.internalApiKey;
    if (!expectedKey || expectedKey.trim() === '') {
      this.logger.warn('INTERNAL_API_KEY not set; API Key auth is disabled (allow all)');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers[HEADER_API_KEY];
    const value = Array.isArray(providedKey) ? providedKey[0] : providedKey;

    if (!value || value.trim() === '') {
      this.logger.warn('Request missing X-INTERNAL-API-KEY header');
      throw new ForbiddenException('Clé API manquante');
    }

    if (value.trim() !== expectedKey.trim()) {
      this.logger.warn('Invalid X-INTERNAL-API-KEY');
      throw new ForbiddenException('Clé API invalide');
    }

    return true;
  }
}
