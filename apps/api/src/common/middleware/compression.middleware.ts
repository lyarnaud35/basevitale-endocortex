import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

/**
 * CompressionMiddleware
 * 
 * Compresse les réponses HTTP avec gzip pour optimiser la bande passante
 * Version BaseVitale Optimisée
 */
@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CompressionMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const originalSend = res.send.bind(res);
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldCompress = acceptEncoding.includes('gzip') || acceptEncoding.includes('deflate');

    if (shouldCompress) {
      res.send = function (body: any) {
        // Convertir le body en string si c'est un objet
        let bodyString: string;
        if (typeof body === 'object' && body !== null) {
          bodyString = JSON.stringify(body);
        } else if (typeof body === 'string') {
          bodyString = body;
        } else {
          bodyString = String(body);
        }

        // Compresser seulement si la taille est > 1KB
        if (bodyString.length > 1024) {
          const zlib = require('zlib');
          
          try {
            const compressed = zlib.gzipSync(bodyString, { level: 6 }); // Niveau de compression optimal
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Content-Length', compressed.length.toString());
            res.setHeader('Vary', 'Accept-Encoding');
            
            return originalSend(compressed);
          } catch (error) {
            // En cas d'erreur, envoyer sans compression
            this.logger.warn('Compression failed, sending uncompressed');
          }
        }

        return originalSend(body);
      };
    }

    next();
  }
}
