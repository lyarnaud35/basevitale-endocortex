import { Module } from '@nestjs/common';
import { ConfigModule } from '../common/services/config.module';
import { XaiLLMService } from './xai-llm.service';
import { LLM_PROVIDER } from './llm-provider.interface';

/**
 * Module LLM - Abstraction du fournisseur (xAI).
 * Injection : LLM_PROVIDER -> XaiLLMService.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    XaiLLMService,
    {
      provide: LLM_PROVIDER,
      useExisting: XaiLLMService,
    },
  ],
  exports: [LLM_PROVIDER, XaiLLMService],
})
export class LlmModule {}
