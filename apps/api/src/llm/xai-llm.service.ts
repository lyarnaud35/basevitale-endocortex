import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../common/services/config.service';
import type {
  LLMProvider,
  ChatCompletionOptions,
  ChatCompletionResult,
} from './llm-provider.interface';
import OpenAI from 'openai';

/**
 * Implémentation xAI (Grok) du LLMProvider.
 * Appel réel à https://api.x.ai/v1/chat/completions via le SDK OpenAI.
 */
@Injectable()
export class XaiLLMService implements LLMProvider {
  private readonly logger = new Logger(XaiLLMService.name);
  private readonly client: OpenAI;

  readonly providerId = 'xai';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.xaiApiKey;
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
    this.logger.log(
      'XaiLLMService initialized (baseURL: https://api.x.ai/v1, model: ' +
        this.configService.cloudModel + ')',
    );
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const model = options.model || this.configService.cloudModel;
    this.logger.debug(`chat(model=${model}, messages=${options.messages.length})`);

    const completion = await this.client.chat.completions.create({
      model,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const usage = completion.usage
      ? {
          prompt: completion.usage.prompt_tokens,
          completion: completion.usage.completion_tokens,
        }
      : undefined;

    this.logger.debug(`chat completed (tokens: ${usage?.prompt ?? 0}+${usage?.completion ?? 0})`);
    return { content, usage };
  }
}
