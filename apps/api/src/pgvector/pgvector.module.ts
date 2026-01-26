import { Module } from '@nestjs/common';
import { PgVectorService } from './pgvector.service';
import { PgVectorController } from './pgvector.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * PgVectorModule
 * 
 * Module pour la recherche sémantique avec pgvector
 * Version BaseVitale V112
 */
@Module({
  imports: [PrismaModule],
  controllers: [PgVectorController],
  providers: [PgVectorService],
  exports: [PgVectorService],
})
export class PgVectorModule {}
