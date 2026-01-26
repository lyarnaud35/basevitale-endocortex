import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * RequestIdMiddleware
 * 
 * Ajoute un ID unique à chaque requête pour le tracing
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Générer un ID unique pour cette requête
    const requestId = randomBytes(8).toString('hex');
    
    // Ajouter à la requête
    req['requestId'] = requestId;
    
    // Ajouter au header de réponse
    res.setHeader('X-Request-Id', requestId);
    
    // Ajouter au logger pour le contexte
    this.logger.debug(`Request ${requestId}: ${req.method} ${req.path}`);
    
    next();
  }
}
