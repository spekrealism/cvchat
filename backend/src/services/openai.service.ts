import OpenAI from 'openai';
import { ChatMessage, ChatStage } from '../types/chat.types';
import { logger } from '../utils/logger';

export class OpenAIService {
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY не найден в переменных окружения');
    }

    this.client = new OpenAI({ apiKey });
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.systemPrompt = process.env.SYSTEM_PROMPT || 
      'Ты помощник на сайте-визитке разработчика. Будь дружелюбным и профессиональным.';
  }

  async generateResponse(messages: ChatMessage[], stage: ChatStage): Promise<string> {
    try {
      // Формируем промпт в зависимости от стадии
      const systemMessage = this.buildSystemPrompt(stage);
      
      // Подготавливаем сообщения для OpenAI
      const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemMessage },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }))
      ];

      logger.info(`Отправка запроса в OpenAI, stage: ${stage}, messages: ${messages.length}`);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.5
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      if (!response) {
        throw new Error('Пустой ответ от OpenAI');
      }

      logger.info(`Получен ответ от OpenAI: ${response.substring(0, 100)}...`);
      return response;

    } catch (error: any) {
      logger.error(`Ошибка OpenAI API: ${error.message}`, { 
        stage, 
        messagesCount: messages.length,
        error: error.response?.data || error.message 
      });
      
      // Возвращаем fallback ответ
      return this.getFallbackResponse(stage);
    }
  }

  async generateStreamingResponse(
    messages: ChatMessage[], 
    stage: ChatStage,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const systemMessage = this.buildSystemPrompt(stage);
      
      const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemMessage },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }))
      ];

      logger.info(`Отправка стрим-запроса в OpenAI, stage: ${stage}`);

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        max_tokens: 500,
        temperature: 0.7,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
      }

      onComplete();
      logger.info(`Стрим от OpenAI завершен успешно`);

    } catch (error: any) {
      logger.error(`Ошибка стрим OpenAI API: ${error.message}`);
      onError(error);
    }
  }

  private buildSystemPrompt(stage: ChatStage): string {
    const basePrompt = this.systemPrompt;
    
    switch (stage) {
      case ChatStage.GREETING:
        return `${basePrompt}

Сейчас этап приветствия. Поприветствуй пользователя дружелюбно и спроси, как ты можешь помочь. 
Представься как ассистент разработчика. Будь кратким но информативным.
Покажи, что готов обсудить проекты, технологии или любые вопросы.`;

      case ChatStage.AI_CLARIFICATION:
        return `${basePrompt}

Сейчас этап уточнения. Пользователь уже ответил на твое приветствие. 
Задай 1-2 уточняющих вопроса, чтобы лучше понять его потребности.
Будь конкретным и полезным. Покажи заинтересованность в его запросе.`;

      case ChatStage.FINAL_RESPONSE:
        return `${basePrompt}

Сейчас финальный этап. Дай полный, развернутый ответ на запрос пользователя.
Включи практические советы, если применимо. 
В конце предложи связаться напрямую для более детального обсуждения.
Этот ответ может быть длиннее предыдущих, так как это завершающий этап.`;

      default:
        return basePrompt;
    }
  }

  private getFallbackResponse(stage: ChatStage): string {
    switch (stage) {
      case ChatStage.GREETING:
        return 'Привет! Я ассистент разработчика. Как я могу тебе помочь? Готов обсудить проекты, технологии или ответить на любые вопросы.';
      
      case ChatStage.AI_CLARIFICATION:
        return 'Интересно! Расскажи чуть подробнее - какие именно аспекты тебя больше всего интересуют?';
      
      case ChatStage.FINAL_RESPONSE:
        return 'Спасибо за вопрос! К сожалению, временно возникли технические сложности с генерацией ответа. Но я обязательно свяжусь с тобой лично для детального обсуждения.';
      
      default:
        return 'Извините, произошла техническая ошибка. Пожалуйста, попробуйте позже.';
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      logger.error('Неверный API ключ OpenAI');
      return false;
    }
  }
} 