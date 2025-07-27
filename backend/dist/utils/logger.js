"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatLogger = exports.securityLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV === 'development';
// Создаем форматтер для логов
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.prettyPrint());
// Создаем форматтер для консоли в разработке
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({
    format: 'HH:mm:ss'
}), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
}));
// Конфигурация транспортов
const transports = [];
// Консольный вывод (всегда включен в разработке)
if (isDevelopment) {
    transports.push(new winston_1.default.transports.Console({
        format: consoleFormat,
        level: logLevel
    }));
}
else {
    transports.push(new winston_1.default.transports.Console({
        format: logFormat,
        level: logLevel
    }));
}
// Файловые логи
if (!isDevelopment) {
    // Общие логи
    transports.push(new winston_1.default.transports.File({
        filename: 'logs/app.log',
        format: logFormat,
        level: logLevel,
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
    // Логи ошибок
    transports.push(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        format: logFormat,
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
}
// Создаем основной логгер
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    // Обработка неперехваченных исключений
    exceptionHandlers: [
        new winston_1.default.transports.File({ filename: 'logs/exceptions.log' })
    ],
    // Обработка неперехваченных промисов
    rejectionHandlers: [
        new winston_1.default.transports.File({ filename: 'logs/rejections.log' })
    ]
});
// Специальные методы для различных типов логов
exports.securityLogger = {
    rateLimitHit: (ip, endpoint, remaining) => {
        exports.logger.warn('Rate limit hit', {
            type: 'RATE_LIMIT_HIT',
            ip,
            endpoint,
            remaining,
            timestamp: new Date().toISOString()
        });
    },
    rateLimitExceeded: (ip, endpoint) => {
        exports.logger.error('Rate limit exceeded', {
            type: 'RATE_LIMIT_EXCEEDED',
            ip,
            endpoint,
            timestamp: new Date().toISOString()
        });
    },
    honeypotTriggered: (ip, field, value) => {
        exports.logger.error('Honeypot triggered', {
            type: 'HONEYPOT_TRIGGERED',
            ip,
            field,
            value,
            timestamp: new Date().toISOString()
        });
    },
    suspiciousActivity: (ip, reason, details) => {
        exports.logger.warn('Suspicious activity detected', {
            type: 'SUSPICIOUS_ACTIVITY',
            ip,
            reason,
            details,
            timestamp: new Date().toISOString()
        });
    },
    ipBlocked: (ip, reason, blockedUntil) => {
        exports.logger.error('IP blocked', {
            type: 'IP_BLOCKED',
            ip,
            reason,
            blockedUntil: blockedUntil.toISOString(),
            timestamp: new Date().toISOString()
        });
    }
};
exports.chatLogger = {
    sessionStarted: (sessionId, ip) => {
        exports.logger.info('Chat session started', {
            type: 'CHAT_SESSION_STARTED',
            sessionId,
            ip,
            timestamp: new Date().toISOString()
        });
    },
    messageReceived: (sessionId, stage, messageLength) => {
        exports.logger.info('Chat message received', {
            type: 'CHAT_MESSAGE_RECEIVED',
            sessionId,
            stage,
            messageLength,
            timestamp: new Date().toISOString()
        });
    },
    sessionCompleted: (sessionId, messageCount, duration) => {
        exports.logger.info('Chat session completed', {
            type: 'CHAT_SESSION_COMPLETED',
            sessionId,
            messageCount,
            durationMs: duration,
            timestamp: new Date().toISOString()
        });
    },
    telegramSent: (sessionId, success, error) => {
        exports.logger.info('Telegram notification sent', {
            type: 'TELEGRAM_NOTIFICATION',
            sessionId,
            success,
            error,
            timestamp: new Date().toISOString()
        });
    }
};
// Экспортируем основной логгер как default
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map