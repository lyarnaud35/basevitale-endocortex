/**
 * BaseVitale API - Main Entry Point
 * Version Cabinet - Architecture Neuro-Symbiotique
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Charger .env à la racine du monorepo (nx serve api tourne depuis la racine)
const rootEnv = join(process.cwd(), '.env');
if (existsSync(rootEnv)) {
  const content = readFileSync(rootEnv, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        if (key && val !== undefined) process.env[key] = val;
      }
    }
  }
}

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ConfigService } from './common/services/config.service';
import { validateEnv } from './common/env';

async function bootstrap() {
  // Ghost Protocol : validation Zod env (XAI_API_KEY requise). Casse au démarrage si manquante.
  validateEnv();

  const logger = new Logger('Bootstrap');
  const configService = new ConfigService();
  
  const app = await NestFactory.create(AppModule, {
    logger: configService.logLevel as any,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // CORS : origines autorisées via ALLOWED_ORIGINS (liste séparée par des virgules)
  const allowedOrigins = configService.allowedOrigins;
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  // Global validation pipe (whitelist + rejet des champs non déclarés = anti-injection)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global interceptors (ordre important)
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(reflector),
  );

  // Global exception filters (ordre important : spécifique → général)
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new DatabaseExceptionFilter(),
    new GlobalExceptionFilter(),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Endocortex API')
    .setDescription(
      'Symbiote – Intelligence Engine (Scribe, Billing, Coding, Security). Livrable Golden Master pour Ben. ' +
        'Authentification : header X-INTERNAL-API-KEY (clé partagée avec le backend partenaire). ' +
        'L’API doit être démarrée pour que « Try it out » fonctionne (pas de ERR_CONNECTION_REFUSED).',
    )
    .setVersion('v115.0')
    .addServer(`/${globalPrefix}`, 'Serveur courant (même origine que cette page)')
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-INTERNAL-API-KEY', description: 'Clé API interne (backend-to-backend)' },
      'X-INTERNAL-API-KEY',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  document.security = [{ 'X-INTERNAL-API-KEY': [] }];
  // Montage explicite sur /api/docs ; JSON aussi sur /api/docs-json
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      deepLinking: false,
      persistAuthorization: true,
    },
  });

  // Exposition du document OpenAPI à /api-json et /api/api-json (générateurs de code, Swagger UI)
  const httpAdapter = app.get(HttpAdapterHost).httpAdapter;
  const server = httpAdapter.getInstance();
  server.get('/api-json', (_req: unknown, res: unknown) => {
    (res as any).status(200).json(document);
  });
  server.get('/api/api-json', (_req: unknown, res: unknown) => {
    (res as any).status(200).json(document);
  });

  const port = configService.port;
  // Listen on all interfaces so Docker can map the port (not only localhost)
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 BaseVitale API is running on: http://0.0.0.0:${port}/${globalPrefix}`);
  logger.log(`📚 Swagger UI: http://0.0.0.0:${port}/${globalPrefix}/docs`);
  logger.log(`🔧 Environment: ${configService.nodeEnv}`);
  logger.log(`🤖 AI Mode: ${configService.aiMode}`);
  logger.log(`📊 Modules: C+ ✅ | S ✅ | E+ ✅ | B+ ✅ | L 🟡`);
  logger.log(`🎯 Architecture: Neuro-Symbiotique - Version Cabinet`);
  logger.log(`🛡️ Security: Rate Limiting ✅ | RBAC ✅ | Sanitization ✅`);
  logger.log(`📈 Monitoring: Logging ✅ | Metrics ✅ | Performance ✅`);
}

bootstrap();
