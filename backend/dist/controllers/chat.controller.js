"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const chat_service_1 = require("../services/chat.service");
const logger_1 = require("../utils/logger");
const joi_1 = __importDefault(require("joi"));
// Валидация схем
const startChatSchema = joi_1.default.object({
    userAgent: joi_1.default.string().max(500).optional(),
    fingerprint: joi_1.default.string().max(100).optional(),
    honeypot: joi_1.default.string().allow('').optional(),
    formFillTime: joi_1.default.number().min(0).max(1000000).optional()
});
const sendMessageSchema = joi_1.default.object({
    sessionId: joi_1.default.string().uuid().required(),
    message: joi_1.default.string().min(1).max(2000).required(),
    formFillTime: joi_1.default.number().min(0).max(1000000).optional()
});
// AG-UI схемы
const aguiRunSchema = joi_1.default.object({
    threadId: joi_1.default.string().required(),
    runId: joi_1.default.string().required(),
    messages: joi_1.default.array().items(joi_1.default.object({
        id: joi_1.default.string().required(),
        role: joi_1.default.string().valid('user', 'assistant', 'system').required(),
        content: joi_1.default.string().required()
    })).required()
});
class ChatController {
    constructor() {
        // Стандартное API для начала чата
        this.startChat = async (req, res) => {
            try {
                // Валидация входных данных
                const { error, value } = startChatSchema.validate(req.body);
                if (error) {
                    res.status(400).json({
                        success: false,
                        error: `Ошибка валидации: ${error.details[0].message}`
                    });
                    return;
                }
                const clientIP = this.getClientIP(req);
                const request = {
                    userAgent: req.headers['user-agent'],
                    fingerprint: value.fingerprint,
                    honeypot: value.honeypot,
                    formFillTime: value.formFillTime,
                    ...value
                };
                const response = await this.chatService.startChat(request, clientIP);
                res.json(response);
            }
            catch (error) {
                logger_1.logger.error(`Ошибка в startChat: ${error.message}`);
                res.status(500).json({
                    success: false,
                    error: 'Внутренняя ошибка сервера'
                });
            }
        };
        // Стандартное API для отправки сообщения
        this.sendMessage = async (req, res) => {
            try {
                const { error, value } = sendMessageSchema.validate(req.body);
                if (error) {
                    res.status(400).json({
                        success: false,
                        error: `Ошибка валидации: ${error.details[0].message}`
                    });
                    return;
                }
                const request = value;
                const response = await this.chatService.sendMessage(request);
                res.json(response);
            }
            catch (error) {
                logger_1.logger.error(`Ошибка в sendMessage: ${error.message}`);
                res.status(500).json({
                    success: false,
                    error: 'Внутренняя ошибка сервера'
                });
            }
        };
        // AG-UI совместимый endpoint с поддержкой Server-Sent Events
        this.runAgent = async (req, res) => {
            try {
                // Валидация AG-UI запроса
                const { error, value } = aguiRunSchema.validate(req.body);
                if (error) {
                    res.status(422).json({
                        error: `Ошибка валидации AG-UI: ${error.details[0].message}`
                    });
                    return;
                }
                const { threadId, runId, messages } = value;
                const clientIP = this.getClientIP(req);
                // Настройка SSE заголовков
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
                // Создаем энкодер для AG-UI событий
                const encoder = new AGUIEventEncoder();
                // Отправляем событие начала выполнения
                res.write(encoder.encode({
                    type: 'RUN_STARTED',
                    threadId,
                    runId
                }));
                try {
                    // Если это первое сообщение в треде, начинаем новый чат
                    if (messages.length === 1 && messages[0].role === 'user') {
                        const startRequest = {
                            userAgent: req.headers['user-agent']
                        };
                        const chatResponse = await this.chatService.startChat(startRequest, clientIP);
                        if (!chatResponse.success) {
                            throw new Error(chatResponse.error || 'Не удалось начать чат');
                        }
                        // Отправляем приветственное сообщение через AG-UI события
                        await this.streamMessage(res, encoder, chatResponse.message || '', chatResponse.sessionId);
                        // Обрабатываем сообщение пользователя
                        const messageRequest = {
                            sessionId: chatResponse.sessionId,
                            message: messages[0].content
                        };
                        const messageResponse = await this.chatService.sendMessage(messageRequest);
                        if (messageResponse.success && messageResponse.message) {
                            await this.streamMessage(res, encoder, messageResponse.message, chatResponse.sessionId);
                        }
                    }
                    else {
                        // Обработка продолжения диалога (если необходимо)
                        res.write(encoder.encode({
                            type: 'TEXT_MESSAGE_START',
                            messageId: this.generateMessageId(),
                            role: 'assistant'
                        }));
                        res.write(encoder.encode({
                            type: 'TEXT_MESSAGE_CONTENT',
                            messageId: this.generateMessageId(),
                            delta: 'Для продолжения диалога используйте стандартное API.'
                        }));
                        res.write(encoder.encode({
                            type: 'TEXT_MESSAGE_END',
                            messageId: this.generateMessageId()
                        }));
                    }
                }
                catch (chatError) {
                    logger_1.logger.error(`Ошибка в AG-UI чате: ${chatError.message}`);
                    res.write(encoder.encode({
                        type: 'ERROR',
                        threadId,
                        runId,
                        error: chatError.message
                    }));
                }
                // Отправляем событие завершения выполнения
                res.write(encoder.encode({
                    type: 'RUN_FINISHED',
                    threadId,
                    runId
                }));
                res.end();
            }
            catch (error) {
                logger_1.logger.error(`Ошибка в runAgent: ${error.message}`);
                res.status(500).json({
                    error: 'Внутренняя ошибка сервера'
                });
            }
        };
        // Получение статистики (для мониторинга)
        this.getStats = async (req, res) => {
            try {
                const stats = {
                    activeSessions: this.chatService.getActiveSessionsCount(),
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime()
                };
                res.json(stats);
            }
            catch (error) {
                logger_1.logger.error(`Ошибка в getStats: ${error.message}`);
                res.status(500).json({ error: 'Ошибка получения статистики' });
            }
        };
        // Health check
        this.healthCheck = async (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        };
        this.chatService = new chat_service_1.ChatService();
    }
    // Вспомогательные методы
    async streamMessage(res, encoder, message, messageId) {
        // Начало сообщения
        res.write(encoder.encode({
            type: 'TEXT_MESSAGE_START',
            messageId,
            role: 'assistant'
        }));
        // Имитируем потоковую передачу, разбивая сообщение на части
        const words = message.split(' ');
        for (let i = 0; i < words.length; i++) {
            const delta = words[i] + (i < words.length - 1 ? ' ' : '');
            res.write(encoder.encode({
                type: 'TEXT_MESSAGE_CONTENT',
                messageId,
                delta
            }));
            // Небольшая задержка для эффекта печатания
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        // Конец сообщения
        res.write(encoder.encode({
            type: 'TEXT_MESSAGE_END',
            messageId
        }));
    }
    getClientIP(req) {
        return (req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            'unknown');
    }
    generateMessageId() {
        return Math.random().toString(36).substring(2, 15);
    }
}
exports.ChatController = ChatController;
// Упрощенный енкодер для AG-UI событий
class AGUIEventEncoder {
    encode(data) {
        return `data: ${JSON.stringify(data)}\n\n`;
    }
}
//# sourceMappingURL=chat.controller.js.map