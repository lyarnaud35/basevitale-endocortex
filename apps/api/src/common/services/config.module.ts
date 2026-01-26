import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

/**
 * ConfigModule
 * 
 * Module global pour la configuration
 */
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
