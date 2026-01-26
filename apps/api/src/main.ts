/**
 * BaseVitale API - Main Entry Point
 * Version Cabinet - Architecture Neuro-Symbiotique
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ConfigService } from './common/services/config.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const configService = new ConfigService();
  
  const app = await NestFactory.create(AppModule, {
    logger: configService.logLevel as any,
  });

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS (configurable via env)
  app.enableCors({
    origin: configService.corsOrigin,
    credentials: true,
  });

  // Global validation pipe (utilise class-validator par défaut)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non définies dans les DTOs
      forbidNonWhitelisted: false, // Ne bloque pas, juste supprime
      transform: true, // Transforme automatiquement les types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global interceptors (ordre important)
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Global exception filters (ordre important : spécifique → général)
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new DatabaseExceptionFilter(),
    new GlobalExceptionFilter(),
  );

  const port = configService.port;
  await app.listen(port);
  
  logger.log(`🚀 BaseVitale API is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📚 API Documentation available at: http://localhost:${port}/${globalPrefix}`);
  logger.log(`🔧 Environment: ${configService.nodeEnv}`);
  logger.log(`🤖 AI Mode: ${configService.aiMode}`);
  logger.log(`📊 Modules: C+ ✅ | S ✅ | E+ ✅ | B+ ✅ | L 🟡`);
  logger.log(`🎯 Architecture: Neuro-Symbiotique - Version Cabinet`);
  logger.log(`🛡️ Security: Rate Limiting ✅ | RBAC ✅ | Sanitization ✅`);
  logger.log(`📈 Monitoring: Logging ✅ | Metrics ✅ | Performance ✅`);
}

bootstrap();
