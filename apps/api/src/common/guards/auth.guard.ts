import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY, Public } from '../decorators/public.decorator';

/**
 * AuthGuard - Garde d'authentification
 * 
 * Version simplifiée pour le développement
 * 
 * TODO: Implémenter l'authentification complète (JWT, 2FA) selon les spécifications INS
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Vérifier si la route est publique
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    
    // En développement, permettre l'accès sans authentification
    // En production, vérifier le token JWT
    if (process.env.NODE_ENV === 'production') {
      const token = this.extractTokenFromHeader(request);
      
      if (!token) {
        this.logger.warn('Access attempt without token');
        throw new UnauthorizedException('Token manquant');
      }

      // TODO: Vérifier le token JWT
      // TODO: Vérifier le 2FA si requis
      
      // Pour l'instant, accepter le token
      (request as any).user = { id: 'user-from-token', token };
    } else {
      // Mode développement : utiliser un utilisateur système
      (request as any).user = { id: 'system', isSystem: true };
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
