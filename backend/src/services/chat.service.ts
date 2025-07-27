import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { 
  ChatSession, 
  ChatMessage, 
  ChatStage, 
  ChatStartRequest, 
  ChatMessageRequest, 
  ChatResponse,
  ChatButton,
  TelegramNotification 
} from '../types/chat.types';
import { OpenAIService } from './openai.service';
import { TelegramService } from './telegram.service';
import { logger, chatLogger } from '../utils/logger';
import { STATIC_MESSAGES } from '../constants/staticMessages';
type Lang = keyof typeof STATIC_MESSAGES;

export class ChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private openaiService: OpenAIService;
  private telegramService: TelegramService;
  private maxMessageLength: number;
  private chatTimeout: number;

  constructor() {
    this.openaiService = new OpenAIService();
    this.telegramService = new TelegramService();
    this.maxMessageLength = parseInt(process.env.MAX_MESSAGE_LENGTH || '2000');
    this.chatTimeout = parseInt(process.env.CHAT_TIMEOUT_MS || '300000'); // 5 минут

    // Очистка старых сессий каждые 10 минут
    setInterval(() => this.cleanupOldSessions(), 10 * 60 * 1000);
  }

  async startChat(request: ChatStartRequest, ip: string): Promise<ChatResponse> {
    try {
      const language: Lang = request.language === 'en' ? 'en' : 'ru';
      // Создаем новую сессию
      const sessionId = uuidv4();
      const hasFingerprint = !!request.fingerprint;
      const session: ChatSession = {
        id: sessionId,
        ip,
        stage: hasFingerprint ? ChatStage.SECOND_CHAT_PRESENTATION : ChatStage.TERMS_AGREEMENT,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date(),
        isBlocked: false,
        tempUserData: {},
        metadata: {
          userAgent: request.userAgent,
          fingerprint: request.fingerprint,
          language
        }
      };

      this.sessions.set(sessionId, session);
      chatLogger.sessionStarted(sessionId, ip);

      const M = STATIC_MESSAGES[language];
      let message: string;
      
      if (hasFingerprint) {
        // Если есть фингерпринт - показываем презентацию
        message = M.PRESENTATION;
        session.stage = ChatStage.AGENT_MODE; // Готовы к работе с агентом
      } else {
        // Если нет фингерпринта - показываем два сообщения подряд
        const messages = [M.HELLO, M.START, M.TERMS, M.AGREEMENT];
        session.stage = ChatStage.TERMS_AGREEMENT;
        
        // Добавляем оба сообщения в сессию
        for (const msg of messages) {
          const assistantMessage: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: msg,
            timestamp: new Date(),
            stage: session.stage
          };
          session.messages.push(assistantMessage);
        }
        
        session.lastActivity = new Date();

        logger.info(`Чат начат для сессии: ${sessionId}, fingerprint: ${hasFingerprint}`);

        // Создаем кнопки для соглашения
        const buttons: ChatButton[] = [
          {
            id: 'agree',
            text: language === 'en' ? 'Yes' : 'Да',
            value: language === 'en' ? 'yes' : 'да',
            variant: 'primary'
          },
          {
            id: 'disagree', 
            text: language === 'en' ? 'No' : 'Нет',
            value: language === 'en' ? 'no' : 'нет',
            variant: 'secondary'
          }
        ];

        return {
          success: true,
          sessionId,
          messages: messages,
          buttons: buttons,
          stage: session.stage
        };
      }
      
      // Добавляем сообщение в сессию
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: message,
        timestamp: new Date(),
        stage: session.stage
      };

      session.messages.push(assistantMessage);
      session.lastActivity = new Date();

      logger.info(`Чат начат для сессии: ${sessionId}, fingerprint: ${hasFingerprint}`);

      return {
        success: true,
        sessionId,
        message,
        stage: session.stage
      };

    } catch (error: any) {
      logger.error(`Ошибка начала чата: ${error.message}`);
      return {
        success: false,
        sessionId: '',
        error: 'Не удалось начать чат. Попробуйте позже.',
        stage: ChatStage.GREETING
      };
    }
  }

  async sendMessage(request: ChatMessageRequest): Promise<ChatResponse> {
    try {
      const session = this.sessions.get(request.sessionId);
      
      if (!session) {
        return {
          success: false,
          sessionId: request.sessionId,
          error: 'Сессия не найдена. Начните новый чат.',
          stage: ChatStage.GREETING
        };
      }

      // Проверяем, не заблокирована ли сессия
      if (session.isBlocked) {
        return {
          success: false,
          sessionId: request.sessionId,
          error: 'Сессия заблокирована.',
          stage: ChatStage.BLOCKED,
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
          stage: ChatStage.GREETING
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

      // Если пришел фингерпринт и его еще нет в сессии, сохраняем его
      if (request.fingerprint && !session.metadata?.fingerprint) {
        if (!session.metadata) {
          session.metadata = {};
        }
        session.metadata.fingerprint = request.fingerprint;
        logger.info(`Фингерпринт добавлен в сессию ${session.id}`);
      }

      // Добавляем сообщение пользователя
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: request.message.trim(),
        timestamp: new Date(),
        stage: session.stage
      };

      session.messages.push(userMessage);
      session.lastActivity = new Date();

      chatLogger.messageReceived(session.id, session.stage, request.message.length);

      // Обрабатываем сообщение в зависимости от этапа
      const response = await this.processMessageByStage(session, request.message.trim());
      
      return response;

    } catch (error: any) {
      logger.error(`Ошибка отправки сообщения: ${error.message}`);
      return {
        success: false,
        sessionId: request.sessionId,
        error: 'Произошла ошибка при обработке сообщения.',
        stage: ChatStage.GREETING
      };
    }
  }

  private async processMessageByStage(session: ChatSession, message: string): Promise<ChatResponse> {
    const lang: Lang = session.metadata?.language as Lang || 'ru';
    const M = STATIC_MESSAGES[lang];
    let responseMessage: string;
    let newStage: ChatStage = session.stage;
    let shouldComplete = false;

    switch (session.stage) {
      case ChatStage.TERMS_AGREEMENT:
        const affirmative = lang === 'en' ? ['yes', 'y'] : ['да'];
        if (affirmative.includes(message.toLowerCase())) {
          responseMessage = M.CONTACT_REQUEST;
          newStage = ChatStage.WAITING_CONTACT_INFO;
          session.tempUserData!.agreedToTerms = true;
        } else {
          responseMessage = lang === 'en'
            ? 'To continue you need to accept the terms of use. Please type "yes" if you agree.'
            : 'Для продолжения работы необходимо согласиться с условиями использования. Напишите "да" если согласны.';
        }
        break;

      case ChatStage.WAITING_CONTACT_INFO:
        // Парсим имя и контакт
        const contactInfo = this.parseContactInfo(message);
        if (contactInfo) {
          session.tempUserData!.name = contactInfo.name;
          session.tempUserData!.contact = contactInfo.contact;
          
          // Генерируем фингерпринт только если его еще нет
          if (!session.metadata?.fingerprint) {
            const fingerprint = this.generateFingerprint(session);
            if (!session.metadata) {
              session.metadata = {};
            }
            session.metadata.fingerprint = fingerprint;
          }
          
          responseMessage = M.FIRST_CHAT_COMPLETE;
          newStage = ChatStage.FIRST_CHAT_COMPLETE;
          shouldComplete = true;
          
          // Очищаем временные данные
          session.tempUserData = {};
        } else {
          responseMessage = lang === 'en'
            ? 'Please provide your name and contact in the format: "John Doe, email@example.com" or "John Doe, +123456789"'
            : 'Пожалуйста, укажите ваше имя и контакт в формате: "Имя Фамилия, email@example.com" или "Имя Фамилия, +7XXXXXXXXXX"';
        }
        break;

      case ChatStage.AGENT_MODE:
        // Определяем количество сообщений от пользователя в текущей сессии AGENT_MODE
        // Учитываем, что сессия для вернувшегося пользователя начинается с сообщения-презентации от ассистента.
        const userMessagesInCurrentAgentSession = session.messages.filter(m => m.role === 'user');

        if (userMessagesInCurrentAgentSession.length === 1) {
          // Это первое сообщение пользователя в ответ на презентацию агента.
          // Агент должен запросить уточнения.
          responseMessage = await this.openaiService.generateResponse(session.messages, ChatStage.AGENT_MODE);
          newStage = ChatStage.AGENT_MODE; // Остаемся в режиме агента, ожидаем ответ на уточнение
          shouldComplete = false; // Чат не завершается
        } else if (userMessagesInCurrentAgentSession.length >= 2) {
          // Это второе (или последующее) сообщение пользователя, т.е. ответ на уточняющий вопрос агента.
          // Отправляем финальное подтверждение и завершаем чат.
          // Можно также отправить это сообщение в OpenAI для финального ответа, если требуется:
          // responseMessage = await this.openaiService.generateResponse(session.messages, ChatStage.AGENT_MODE);
          responseMessage = "Спасибо за ваши уточнения! Ваш запрос принят и будет обработан в ближайшее время.";
          shouldComplete = true; // Завершаем чат
          newStage = ChatStage.AGENT_MODE; // Стадия изменится на COMPLETED после этого блока
        } else {
          // Неожиданная ситуация, например, если нет сообщений от пользователя, хотя мы в AGENT_MODE.
          // Для безопасности, просто получим стандартный ответ от OpenAI.
          logger.warn(`[ChatService] AGENT_MODE: Неожиданное количество (${userMessagesInCurrentAgentSession.length}) сообщений от пользователя для сессии ${session.id}.`);
          responseMessage = await this.openaiService.generateResponse(session.messages, ChatStage.AGENT_MODE);
          newStage = ChatStage.AGENT_MODE;
        }
        break;

      default:
        responseMessage = 'Произошла ошибка в обработке сообщения.';
    }

    // Добавляем ответ в сессию
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: responseMessage,
      timestamp: new Date(),
      stage: newStage
    };

    session.messages.push(assistantMessage);
    session.stage = newStage;
    session.lastActivity = new Date();

    // Если чат завершен
    if (shouldComplete) {
      session.stage = ChatStage.COMPLETED;
      // Отправляем в Telegram
      await this.completeChat(session);
    }

    return {
      success: true,
      sessionId: session.id,
      message: responseMessage,
      stage: session.stage,
      isCompleted: shouldComplete
    };
  }

  private parseContactInfo(message: string): { name: string; contact: string } | null {
    // Простая регулярка для парсинга "Имя Фамилия, контакт"
    const patterns = [
      /^([А-Яа-яA-Za-z\s]{2,50}),\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/,
      /^([А-Яа-яA-Za-z\s]{2,50}),\s*(\+?[0-9\s\-\(\)]{7,15})$/
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          name: match[1].trim(),
          contact: match[2].trim()
        };
      }
    }

    return null;
  }

  private generateFingerprint(session: ChatSession): string {
    // Используем криптографическое хеширование
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const userAgent = session.metadata?.userAgent || '';
    const ip = session.ip;
    
    const data = `${timestamp}-${random}-${userAgent}-${ip}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  private async completeChat(session: ChatSession): Promise<void> {
    try {
      // Блокируем сессию от дальнейших сообщений
      session.isBlocked = true;
      session.stage = ChatStage.COMPLETED;

      // Отправляем уведомление в Telegram
      const notification: TelegramNotification = {
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
      chatLogger.sessionCompleted(session.id, session.messages.length, duration);

      logger.info(`Чат завершен для сессии: ${session.id}`);

    } catch (error: any) {
      logger.error(`Ошибка завершения чата: ${error.message}`);
    }
  }

  private validateMessage(message: string): string | null {
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

  private isSessionExpired(session: ChatSession): boolean {
    const now = Date.now();
    const lastActivity = session.lastActivity.getTime();
    return (now - lastActivity) > this.chatTimeout;
  }

  private cleanupOldSessions(): void {
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
      logger.info(`Очищено ${cleanedCount} старых сессий чата`);
    }
  }

  // Публичные методы для мониторинга
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  getSessionInfo(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Принудительное завершение сессии (для админки)
  async forceCompleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    await this.completeChat(session);
    return true;
  }

  // Блокировка сессии
  blockSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isBlocked = true;
    session.stage = ChatStage.BLOCKED;
    logger.warn(`Сессия ${sessionId} заблокирована вручную`);
    return true;
  }
} 