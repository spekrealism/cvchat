"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const grammy_1 = require("grammy");
const logger_1 = require("../utils/logger");
class TelegramService {
    constructor() {
        this.bot = null;
        this.chatId = '';
        this.isEnabled = false;
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!token || !chatId) {
            logger_1.logger.warn('Telegram bot не настроен - отсутствуют TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
            return;
        }
        try {
            this.bot = new grammy_1.Bot(token);
            this.chatId = chatId;
            this.isEnabled = true;
            logger_1.logger.info('Telegram сервис инициализирован');
        }
        catch (error) {
            logger_1.logger.error(`Ошибка инициализации Telegram bot: ${error.message}`);
        }
    }
    async sendChatNotification(notification) {
        if (!this.isEnabled || !this.bot) {
            logger_1.logger.debug('Telegram отправка пропущена - сервис не настроен');
            return false;
        }
        try {
            const message = this.formatChatMessage(notification);
            await this.bot.api.sendMessage(this.chatId, message, {
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true }
            });
            logger_1.chatLogger.telegramSent(notification.sessionId, true);
            logger_1.logger.info(`Уведомление отправлено в Telegram для сессии: ${notification.sessionId}`);
            return true;
        }
        catch (error) {
            const errorMsg = error.message || 'Неизвестная ошибка';
            logger_1.chatLogger.telegramSent(notification.sessionId, false, errorMsg);
            logger_1.logger.error(`Ошибка отправки в Telegram: ${errorMsg}`, {
                sessionId: notification.sessionId,
                chatId: this.chatId
            });
            return false;
        }
    }
    async sendSimpleMessage(text) {
        if (!this.isEnabled || !this.bot) {
            return false;
        }
        try {
            await this.bot.api.sendMessage(this.chatId, text, {
                parse_mode: 'HTML'
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Ошибка отправки простого сообщения в Telegram: ${error.message}`);
            return false;
        }
    }
    async sendAlert(title, details) {
        if (!this.isEnabled || !this.bot) {
            return false;
        }
        try {
            const message = `🚨 <b>${title}</b>\n\n${details}`;
            await this.bot.api.sendMessage(this.chatId, message, {
                parse_mode: 'HTML'
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Ошибка отправки алерта в Telegram: ${error.message}`);
            return false;
        }
    }
    formatChatMessage(notification) {
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
    getRoleIcon(role) {
        switch (role) {
            case 'user': return '👤';
            case 'assistant': return '🤖';
            case 'system': return '⚙️';
            default: return '💬';
        }
    }
    getRoleName(role) {
        switch (role) {
            case 'user': return 'Пользователь';
            case 'assistant': return 'Ассистент';
            case 'system': return 'Система';
            default: return 'Неизвестно';
        }
    }
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    async testConnection() {
        if (!this.isEnabled || !this.bot) {
            return false;
        }
        try {
            const botInfo = await this.bot.api.getMe();
            logger_1.logger.info(`Telegram bot подключен: @${botInfo.username}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Ошибка подключения к Telegram: ${error.message}`);
            return false;
        }
    }
    isConfigured() {
        return this.isEnabled;
    }
}
exports.TelegramService = TelegramService;
//# sourceMappingURL=telegram.service.js.map