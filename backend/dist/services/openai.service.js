"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const chat_types_1 = require("../types/chat.types");
const logger_1 = require("../utils/logger");
class OpenAIService {
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY не найден в переменных окружения');
        }
        this.client = new openai_1.default({ apiKey });
        this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
        this.systemPrompt = process.env.SYSTEM_PROMPT ||
            'Ты помощник на сайте-визитке разработчика. Будь дружелюбным и профессиональным.';
    }
    async generateResponse(messages, stage) {
        try {
            // Формируем промпт в зависимости от стадии
            const systemMessage = this.buildSystemPrompt(stage);
            // Подготавливаем сообщения для OpenAI
            const openaiMessages = [
                { role: 'system', content: systemMessage },
                ...messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            ];
            logger_1.logger.info(`Отправка запроса в OpenAI, stage: ${stage}, messages: ${messages.length}`);
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
            logger_1.logger.info(`Получен ответ от OpenAI: ${response.substring(0, 100)}...`);
            return response;
        }
        catch (error) {
            logger_1.logger.error(`Ошибка OpenAI API: ${error.message}`, {
                stage,
                messagesCount: messages.length,
                error: error.response?.data || error.message
            });
            // Возвращаем fallback ответ
            return this.getFallbackResponse(stage);
        }
    }
    async generateStreamingResponse(messages, stage, onChunk, onComplete, onError) {
        try {
            const systemMessage = this.buildSystemPrompt(stage);
            const openaiMessages = [
                { role: 'system', content: systemMessage },
                ...messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            ];
            logger_1.logger.info(`Отправка стрим-запроса в OpenAI, stage: ${stage}`);
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
            logger_1.logger.info(`Стрим от OpenAI завершен успешно`);
        }
        catch (error) {
            logger_1.logger.error(`Ошибка стрим OpenAI API: ${error.message}`);
            onError(error);
        }
    }
    buildSystemPrompt(stage) {
        const basePrompt = this.systemPrompt;
        switch (stage) {
            case chat_types_1.ChatStage.GREETING:
                return `${basePrompt}

Сейчас этап приветствия. Поприветствуй пользователя дружелюбно и спроси, как ты можешь помочь. 
Представься как ассистент разработчика. Будь кратким но информативным.
Покажи, что готов обсудить проекты, технологии или любые вопросы.`;
            case chat_types_1.ChatStage.AI_CLARIFICATION:
                return `${basePrompt}

Сейчас этап уточнения. Пользователь уже ответил на твое приветствие. 
Задай 1-2 уточняющих вопроса, чтобы лучше понять его потребности.
Будь конкретным и полезным. Покажи заинтересованность в его запросе.`;
            case chat_types_1.ChatStage.FINAL_RESPONSE:
                return `${basePrompt}

Сейчас финальный этап. Дай полный, развернутый ответ на запрос пользователя.
Включи практические советы, если применимо. 
В конце предложи связаться напрямую для более детального обсуждения.
Этот ответ может быть длиннее предыдущих, так как это завершающий этап.`;
            default:
                return basePrompt;
        }
    }
    getFallbackResponse(stage) {
        switch (stage) {
            case chat_types_1.ChatStage.GREETING:
                return 'Привет! Я ассистент разработчика. Как я могу тебе помочь? Готов обсудить проекты, технологии или ответить на любые вопросы.';
            case chat_types_1.ChatStage.AI_CLARIFICATION:
                return 'Интересно! Расскажи чуть подробнее - какие именно аспекты тебя больше всего интересуют?';
            case chat_types_1.ChatStage.FINAL_RESPONSE:
                return 'Спасибо за вопрос! К сожалению, временно возникли технические сложности с генерацией ответа. Но я обязательно свяжусь с тобой лично для детального обсуждения.';
            default:
                return 'Извините, произошла техническая ошибка. Пожалуйста, попробуйте позже.';
        }
    }
    async validateApiKey() {
        try {
            await this.client.models.list();
            return true;
        }
        catch (error) {
            logger_1.logger.error('Неверный API ключ OpenAI');
            return false;
        }
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=openai.service.js.map