import { Module } from '@nestjs/common';
import { QueryOptimizerService } from './query-optimizer.service';

/**
 * QueryOptimizerModule
 * 
 * Module pour les optimisations de requêtes
 */
@Module({
  providers: [QueryOptimizerService],
  exports: [QueryOptimizerService],
})
export class QueryOptimizerModule {}
