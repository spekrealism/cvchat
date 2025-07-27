import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { ChatStartRequest, ChatMessageRequest } from '../types/chat.types';
import { logger } from '../utils/logger';
import Joi from 'joi';

// Валидация схем
const startChatSchema = Joi.object({
  userAgent: Joi.string().max(500).optional(),
  fingerprint: Joi.string().max(100).optional(),
  honeypot: Joi.string().allow('').optional(),
  formFillTime: Joi.number().min(0).max(600000).optional(),
  language: Joi.string().valid('ru', 'en').optional()
});

const sendMessageSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  message: Joi.string().min(1).max(2000).required(),
  formFillTime: Joi.number().min(0).max(600000).optional(),
  fingerprint: Joi.string().max(100).optional()
});

// AG-UI схемы (упрощенные для новой логики)
const aguiRunSchema = Joi.object({
  threadId: Joi.string().required(),
  runId: Joi.string().required(),
  messages: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      role: Joi.string().valid('user', 'assistant', 'system').required(),
      content: Joi.string().required()
    })
  ).required()
});

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  // Стандартное API для начала чата
  startChat = async (req: Request, res: Response): Promise<void> => {
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
      const request: ChatStartRequest = {
        userAgent: req.headers['user-agent'],
        fingerprint: value.fingerprint,
        honeypot: value.honeypot,
        formFillTime: value.formFillTime,
        ...value
      };

      const response = await this.chatService.startChat(request, clientIP);
      res.json(response);

    } catch (error: any) {
      logger.error(`Ошибка в startChat: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  };

  // Стандартное API для отправки сообщения
  sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = sendMessageSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: `Ошибка валидации: ${error.details[0].message}`
        });
        return;
      }

      const request: ChatMessageRequest = value;
      const response = await this.chatService.sendMessage(request);
      res.json(response);

    } catch (error: any) {
      logger.error(`Ошибка в sendMessage: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  };

  // AG-UI совместимый endpoint с поддержкой Server-Sent Events
  runAgent = async (req: Request, res: Response): Promise<void> => {
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
        let chatResponse;
        let messageId = this.generateMessageId();

        // Если это первое сообщение, начинаем новый чат
        if (messages.length === 1 && messages[0].role === 'user') {
          // Попробуем найти фингерпринт в заголовках или создать запрос без него
          const startRequest: ChatStartRequest = {
            userAgent: req.headers['user-agent'],
            fingerprint: req.headers['x-fingerprint'] as string // Можно передавать в заголовке
          };

          chatResponse = await this.chatService.startChat(startRequest, clientIP);
          
          if (!chatResponse.success) {
            throw new Error(chatResponse.error || 'Не удалось начать чат');
          }

          // Отправляем приветственное/статичное сообщение
          await this.streamMessage(res, encoder, chatResponse.message || '', messageId);

          // Обрабатываем первое сообщение пользователя только если мы в режиме агента
          if (chatResponse.stage === 'agent_mode') {
            const messageRequest: ChatMessageRequest = {
              sessionId: chatResponse.sessionId,
              message: messages[0].content
            };

            const messageResponse = await this.chatService.sendMessage(messageRequest);
            
            if (messageResponse.success && messageResponse.message) {
              messageId = this.generateMessageId();
              await this.streamMessage(res, encoder, messageResponse.message, messageId);
            }
          }

        } else if (messages.length > 1) {
          // Для продолжения диалога - ищем существующую сессию или уведомляем о необходимости начать заново
          messageId = this.generateMessageId();
          
          res.write(encoder.encode({
            type: 'TEXT_MESSAGE_START',
            messageId,
            role: 'assistant'
          }));

          const helpMessage = 'Для продолжения диалога начните новый чат. Используйте стандартное API для многоэтапных диалогов.';
          
          res.write(encoder.encode({
            type: 'TEXT_MESSAGE_CONTENT',
            messageId,
            delta: helpMessage
          }));

          res.write(encoder.encode({
            type: 'TEXT_MESSAGE_END',
            messageId
          }));
        }

      } catch (chatError: any) {
        logger.error(`Ошибка в AG-UI чате: ${chatError.message}`);
        
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

    } catch (error: any) {
      logger.error(`Ошибка в runAgent: ${error.message}`);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера'
      });
    }
  };

  // Получение статистики (для мониторинга)
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = {
        activeSessions: this.chatService.getActiveSessionsCount(),
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };

      res.json(stats);
    } catch (error: any) {
      logger.error(`Ошибка в getStats: ${error.message}`);
      res.status(500).json({ error: 'Ошибка получения статистики' });
    }
  };

  // Health check
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  };

  // Вспомогательные методы
  private async streamMessage(
    res: Response, 
    encoder: AGUIEventEncoder, 
    message: string, 
    messageId: string
  ): Promise<void> {
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

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Упрощенный енкодер для AG-UI событий
class AGUIEventEncoder {
  encode(data: any): string {
    return `data: ${JSON.stringify(data)}\n\n`;
  }
} 