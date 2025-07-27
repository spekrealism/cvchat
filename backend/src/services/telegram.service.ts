import { Bot } from 'grammy';
import { TelegramNotification, ChatMessage } from '../types/chat.types';
import { logger, chatLogger } from '../utils/logger';

export class TelegramService {
  private bot: Bot | null = null;
  private chatId: string = '';
  private isEnabled: boolean = false;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      logger.warn('Telegram bot не настроен - отсутствуют TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
      return;
    }

    try {
      this.bot = new Bot(token);
      this.chatId = chatId;
      this.isEnabled = true;
      logger.info('Telegram сервис инициализирован');
    } catch (error: any) {
      logger.error(`Ошибка инициализации Telegram bot: ${error.message}`);
    }
  }

  async sendChatNotification(notification: TelegramNotification): Promise<boolean> {
    if (!this.isEnabled || !this.bot) {
      logger.debug('Telegram отправка пропущена - сервис не настроен');
      return false;
    }

    try {
      const message = this.formatChatMessage(notification);
      
      await this.bot.api.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });

      chatLogger.telegramSent(notification.sessionId, true);
      logger.info(`Уведомление отправлено в Telegram для сессии: ${notification.sessionId}`);
      return true;

    } catch (error: any) {
      const errorMsg = error.message || 'Неизвестная ошибка';
      chatLogger.telegramSent(notification.sessionId, false, errorMsg);
      logger.error(`Ошибка отправки в Telegram: ${errorMsg}`, {
        sessionId: notification.sessionId,
        chatId: this.chatId
      });
      return false;
    }
  }

  async sendSimpleMessage(text: string): Promise<boolean> {
    if (!this.isEnabled || !this.bot) {
      return false;
    }

    try {
      await this.bot.api.sendMessage(this.chatId, text, {
        parse_mode: 'HTML'
      });
      return true;
    } catch (error: any) {
      logger.error(`Ошибка отправки простого сообщения в Telegram: ${error.message}`);
      return false;
    }
  }

  async sendAlert(title: string, details: string): Promise<boolean> {
    if (!this.isEnabled || !this.bot) {
      return false;
    }

    try {
      const message = `🚨 <b>${title}</b>\n\n${details}`;
      await this.bot.api.sendMessage(this.chatId, message, {
        parse_mode: 'HTML'
      });
      return true;
    } catch (error: any) {
      logger.error(`Ошибка отправки алерта в Telegram: ${error.message}`);
      return false;
    }
  }

  private formatChatMessage(notification: TelegramNotification): string {
    const { sessionId, messages, userInfo } = notification;
    const timestamp = new Date().toLocaleString('ru-RU');
    
    let message = `💬 <b>Новый чат-запрос</b>\n\n`;
    message += `🆔 <b>Сессия:</b> <code>${sessionId.substring(0, 8)}...</code>\n`;
    message += `🕐 <b>Время:</b> ${timestamp}\n`;
    message += `🌍 <b>IP:</b> <code>${userInfo.ip}</code>\n`;
    
    if (userInfo.userAgent) {
      const ua = userInfo.userAgent.length > 50 
        ? userInfo.userAgent.substring(0, 50) + '...' 
        : userInfo.userAgent;
      message += `📱 <b>User Agent:</b> <code>${ua}</code>\n`;
    }

    message += `\n📝 <b>Диалог:</b>\n`;
    message += `${'-'.repeat(40)}\n`;

    // Добавляем сообщения диалога
    messages.forEach((msg, index) => {
      const role = this.getRoleIcon(msg.role);
      const content = msg.content.length > 200 
        ? msg.content.substring(0, 200) + '...'
        : msg.content;
      
      message += `\n${role} <b>${this.getRoleName(msg.role)}:</b>\n`;
      message += `${this.escapeHtml(content)}\n`;
      
      if (index < messages.length - 1) {
        message += `${'-'.repeat(20)}\n`;
      }
    });

    message += `\n${'-'.repeat(40)}`;
    message += `\n\n✉️ Ответь на это сообщение, чтобы связаться с пользователем`;

    return message;
  }

  private getRoleIcon(role: string): string {
    switch (role) {
      case 'user': return '👤';
      case 'assistant': return '🤖';
      case 'system': return '⚙️';
      default: return '💬';
    }
  }

  private getRoleName(role: string): string {
    switch (role) {
      case 'user': return 'Пользователь';
      case 'assistant': return 'Ассистент';
      case 'system': return 'Система';
      default: return 'Неизвестно';
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  async testConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.bot) {
      return false;
    }

    try {
      const botInfo = await this.bot.api.getMe();
      logger.info(`Telegram bot подключен: @${botInfo.username}`);
      return true;
    } catch (error: any) {
      logger.error(`Ошибка подключения к Telegram: ${error.message}`);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }
} 