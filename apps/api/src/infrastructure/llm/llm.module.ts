import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLM_SERVICE } from './llm.port';
import { OpenAILLMAdapter } from './openai.adapter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LLM_SERVICE,
      useClass: OpenAILLMAdapter,
    },
  ],
  exports: [LLM_SERVICE],
})
export class LLMModule {}
