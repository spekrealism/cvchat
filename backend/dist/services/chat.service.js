"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const uuid_1 = require("uuid");
const chat_types_1 = require("../types/chat.types");
const openai_service_1 = require("./openai.service");
const telegram_service_1 = require("./telegram.service");
const logger_1 = require("../utils/logger");
class ChatService {
    constructor() {
        this.sessions = new Map();
        this.openaiService = new openai_service_1.OpenAIService();
        this.telegramService = new telegram_service_1.TelegramService();
        this.maxMessageLength = parseInt(process.env.MAX_MESSAGE_LENGTH || '2000');
        this.chatTimeout = parseInt(process.env.CHAT_TIMEOUT_MS || '300000'); // 5 минут
        // Очистка старых сессий каждые 10 минут
        setInterval(() => this.cleanupOldSessions(), 10 * 60 * 1000);
    }
    async startChat(request, ip) {
        try {
            // Создаем новую сессию
            const sessionId = (0, uuid_1.v4)();
            const session = {
                id: sessionId,
                ip,
                stage: chat_types_1.ChatStage.GREETING,
                messages: [],
                createdAt: new Date(),
                lastActivity: new Date(),
                isBlocked: false,
                metadata: {
                    userAgent: request.userAgent,
                    fingerprint: request.fingerprint
                }
            };
            this.sessions.set(sessionId, session);
            logger_1.chatLogger.sessionStarted(sessionId, ip);
            // Генерируем приветственное сообщение
            const greetingMessage = await this.openaiService.generateResponse([], chat_types_1.ChatStage.GREETING);
            // Добавляем приветствие в сессию
            const assistantMessage = {
                id: (0, uuid_1.v4)(),
                role: 'assistant',
                content: greetingMessage,
                timestamp: new Date(),
                stage: chat_types_1.ChatStage.GREETING
            };
            session.messages.push(assistantMessage);
            session.stage = chat_types_1.ChatStage.USER_RESPONSE;
            session.lastActivity = new Date();
            logger_1.logger.info(`Чат начат для сессии: ${sessionId}`);
            return {
                success: true,
                sessionId,
                message: greetingMessage,
                stage: session.stage
            };
        }
        catch (error) {
            logger_1.logger.error(`Ошибка начала чата: ${error.message}`);
            return {
                success: false,
                sessionId: '',
                error: 'Не удалось начать чат. Попробуйте позже.',
                stage: chat_types_1.ChatStage.GREETING
            };
        }
    }
    async sendMessage(request) {
        try {
            const session = this.sessions.get(request.sessionId);
            if (!session) {
                return {
                    success: false,
                    sessionId: request.sessionId,
                    error: 'Сессия не найдена. Начните новый чат.',
                    stage: chat_types_1.ChatStage.GREETING
                };
            }
            // Проверяем, не заблокирована ли сессия
            if (session.isBlocked) {
                return {
                    success: false,
                    sessionId: request.sessionId,
                    error: 'Сессия заблокирована.',
                    stage: chat_types_1.ChatStage.BLOCKED,
                    isBlocked: true
                };
            }
            // Проверяем timeout
            if (this.isSessionExpired(session)) {
                this.sessions.delete(request.sessionId);
                return {
                    success: false,
                    sessionId: request.sessionId,
                    error: 'Сессия истекла. Начните новый чат.',
                    stage: chat_types_1.ChatStage.GREETING
                };
            }
            // Валидируем сообщение
            const validationError = this.validateMessage(request.message);
            if (validationError) {
                return {
                    success: false,
                    sessionId: request.sessionId,
                    error: validationError,
                    stage: session.stage
                };
            }
            // Добавляем сообщение пользователя
            const userMessage = {
                id: (0, uuid_1.v4)(),
                role: 'user',
                content: request.message.trim(),
                timestamp: new Date(),
                stage: session.stage
            };
            session.messages.push(userMessage);
            session.lastActivity = new Date();
            logger_1.chatLogger.messageReceived(session.id, session.stage, request.message.length);
            // Определяем следующую стадию и генерируем ответ
            const response = await this.processUserMessage(session);
            return response;
        }
        catch (error) {
            logger_1.logger.error(`Ошибка отправки сообщения: ${error.message}`);
            return {
                success: false,
                sessionId: request.sessionId,
                error: 'Произошла ошибка при обработке сообщения.',
                stage: chat_types_1.ChatStage.GREETING
            };
        }
    }
    async processUserMessage(session) {
        let nextStage;
        let shouldComplete = false;
        // Определяем следующую стадию
        switch (session.stage) {
            case chat_types_1.ChatStage.USER_RESPONSE:
                nextStage = chat_types_1.ChatStage.AI_CLARIFICATION;
                break;
            case chat_types_1.ChatStage.AI_CLARIFICATION:
                nextStage = chat_types_1.ChatStage.FINAL_RESPONSE;
                shouldComplete = true;
                break;
            default:
                nextStage = chat_types_1.ChatStage.COMPLETED;
                shouldComplete = true;
        }
        // Генерируем ответ ИИ
        const aiResponse = await this.openaiService.generateResponse(session.messages, nextStage);
        // Добавляем ответ ИИ в сессию
        const assistantMessage = {
            id: (0, uuid_1.v4)(),
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date(),
            stage: nextStage
        };
        session.messages.push(assistantMessage);
        session.stage = shouldComplete ? chat_types_1.ChatStage.COMPLETED : nextStage;
        session.lastActivity = new Date();
        // Если чат завершен, отправляем в Telegram и блокируем сессию
        if (shouldComplete) {
            await this.completeChat(session);
        }
        return {
            success: true,
            sessionId: session.id,
            message: aiResponse,
            stage: session.stage,
            isCompleted: shouldComplete
        };
    }
    async completeChat(session) {
        try {
            // Блокируем сессию от дальнейших сообщений
            session.isBlocked = true;
            session.stage = chat_types_1.ChatStage.COMPLETED;
            // Отправляем уведомление в Telegram
            const notification = {
                sessionId: session.id,
                messages: session.messages,
                userInfo: {
                    ip: session.ip,
                    userAgent: session.metadata?.userAgent,
                    fingerprint: session.metadata?.fingerprint
                }
            };
            await this.telegramService.sendChatNotification(notification);
            const duration = Date.now() - session.createdAt.getTime();
            logger_1.chatLogger.sessionCompleted(session.id, session.messages.length, duration);
            logger_1.logger.info(`Чат завершен для сессии: ${session.id}`);
        }
        catch (error) {
            logger_1.logger.error(`Ошибка завершения чата: ${error.message}`);
        }
    }
    validateMessage(message) {
        if (!message || message.trim().length === 0) {
            return 'Сообщение не может быть пустым';
        }
        if (message.length > this.maxMessageLength) {
            return `Сообщение слишком длинное (максимум ${this.maxMessageLength} символов)`;
        }
        // Проверка на спам-паттерны
        const spamPatterns = [
            /(.)\1{10,}/, // Повторяющиеся символы
            /^[A-Z\s!]{20,}$/, // Только заглавные буквы
            /(https?:\/\/[^\s]+)/gi // URL ссылки
        ];
        for (const pattern of spamPatterns) {
            if (pattern.test(message)) {
                return 'Сообщение содержит недопустимый контент';
            }
        }
        return null;
    }
    isSessionExpired(session) {
        const now = Date.now();
        const lastActivity = session.lastActivity.getTime();
        return (now - lastActivity) > this.chatTimeout;
    }
    cleanupOldSessions() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [sessionId, session] of this.sessions.entries()) {
            const lastActivity = session.lastActivity.getTime();
            const age = now - lastActivity;
            // Удаляем сессии старше 1 часа
            if (age > 60 * 60 * 1000) {
                this.sessions.delete(sessionId);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger_1.logger.info(`Очищено ${cleanedCount} старых сессий чата`);
        }
    }
    // Публичные методы для мониторинга
    getActiveSessionsCount() {
        return this.sessions.size;
    }
    getSessionInfo(sessionId) {
        return this.sessions.get(sessionId);
    }
    // Принудительное завершение сессии (для админки)
    async forceCompleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }
        await this.completeChat(session);
        return true;
    }
    // Блокировка сессии
    blockSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }
        session.isBlocked = true;
        session.stage = chat_types_1.ChatStage.BLOCKED;
        logger_1.logger.warn(`Сессия ${sessionId} заблокирована вручную`);
        return true;
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=chat.service.js.map