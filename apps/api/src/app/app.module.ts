import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { MetricsService } from '../common/services/metrics.service';
import { HealthService } from '../common/services/health.service';
import { ScribeModule } from '../scribe/scribe.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { BillingModule } from '../billing/billing.module';
import { CodingModule } from '../coding/coding.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { WebSocketsModule } from '../websockets/websockets.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { NatsModule } from '../nats/nats.module';
import { NeuroSymbolicModule } from '../neuro-symbolic/neuro-symbolic.module';
import { InteropModule } from '../interop/interop.module';
import { PgVectorModule } from '../pgvector/pgvector.module';
import { DPIModule } from '../dpi/dpi.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { MessagingModule } from '../messaging/messaging.module';
import { StaffModule } from '../staff/staff.module';
import { InventoryModule } from '../inventory/inventory.module';
import { TranscriptionModule } from '../transcription/transcription.module';
import { LISModule } from '../lis/lis.module';
import { ESBModule } from '../esb/esb.module';
import { BackupModule } from '../backup/backup.module';
import { PDFExtractionModule } from '../pdf-extraction/pdf-extraction.module';
import { DocumentAnalysisModule } from '../document-analysis/document-analysis.module';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { LoggingMiddleware } from '../common/middleware/logging.middleware';
import { RequestIdMiddleware } from '../common/middleware/request-id.middleware';
import { RateLimitMiddleware } from '../common/middleware/rate-limit.middleware';
import { SecurityMiddleware } from '../common/middleware/security.middleware';
import { HelmetMiddleware } from '../common/middleware/helmet.middleware';
import { CacheModule } from '../common/services/cache.module';
import { ConfigModule } from '../common/services/config.module';
import { QueryOptimizerModule } from '../common/services/query-optimizer.module';
import { PerformanceInterceptor } from '../common/interceptors/performance.interceptor';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';
import { CompressionMiddleware } from '../common/middleware/compression.middleware';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CoreGhostModule } from '../core-ghost/core-ghost.module';
import { ScribeGhostController } from '../scribe/scribe-ghost.controller';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    ConfigModule,
    CacheModule,
    PrismaModule,
    Neo4jModule,
    CoreGhostModule,
    ScribeModule,
    SecurityModule,
    IdentityModule,
    KnowledgeGraphModule,
    BillingModule,
    CodingModule,
    FeedbackModule,
    WebSocketsModule,
    OrchestratorModule,
    NatsModule,
    NeuroSymbolicModule,
    InteropModule,
    PgVectorModule,
    DPIModule,
    AppointmentsModule,
    MessagingModule,
    StaffModule,
    InventoryModule,
    TranscriptionModule,
    LISModule,
    ESBModule,
    BackupModule,
    PDFExtractionModule,
    DocumentAnalysisModule,
    BullModule.forRoot({
      redis: {
        host:
          process.env.REDIS_HOST === 'redis' && process.env.NODE_ENV === 'development'
            ? 'localhost'
            : (process.env.REDIS_HOST || 'localhost'),
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
  ],
  controllers: [AppController, HealthController, MetricsController, ScribeGhostController],
  providers: [
    AppService,
    MetricsService,
    HealthService,
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor, multi: true } as any,
    { provide: APP_INTERCEPTOR, useClass: PerformanceInterceptor, multi: true } as any,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Ordre important : Helmet → Security → Request ID → Compression → Rate Limit → Logging
    consumer
      .apply(
        HelmetMiddleware,
        SecurityMiddleware,
        RequestIdMiddleware,
        CompressionMiddleware,
        RateLimitMiddleware,
        LoggingMiddleware,
      )
      .forRoutes('*');
  }
}
