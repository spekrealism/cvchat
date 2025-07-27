import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV === 'development';

// Создаем форматтер для логов
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Создаем форматтер для консоли в разработке
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Конфигурация транспортов
const transports: winston.transport[] = [];

// Консольный вывод (всегда включен в разработке)
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: logLevel
    })
  );
}

// Файловые логи
if (!isDevelopment) {
  // Общие логи
  transports.push(
    new winston.transports.File({
      filename: 'logs/app.log',
      format: logFormat,
      level: logLevel,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // Логи ошибок
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      format: logFormat,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Создаем основной логгер
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  // Обработка неперехваченных исключений
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  // Обработка неперехваченных промисов
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Специальные методы для различных типов логов
export const securityLogger = {
  rateLimitHit: (ip: string, endpoint: string, remaining: number) => {
    logger.warn('Rate limit hit', {
      type: 'RATE_LIMIT_HIT',
      ip,
      endpoint,
      remaining,
      timestamp: new Date().toISOString()
    });
  },

  rateLimitExceeded: (ip: string, endpoint: string) => {
    logger.error('Rate limit exceeded', {
      type: 'RATE_LIMIT_EXCEEDED',
      ip,
      endpoint,
      timestamp: new Date().toISOString()
    });
  },

  honeypotTriggered: (ip: string, field: string, value: string) => {
    logger.error('Honeypot triggered', {
      type: 'HONEYPOT_TRIGGERED',
      ip,
      field,
      value,
      timestamp: new Date().toISOString()
    });
  },

  suspiciousActivity: (ip: string, reason: string, details: any) => {
    logger.warn('Suspicious activity detected', {
      type: 'SUSPICIOUS_ACTIVITY',
      ip,
      reason,
      details,
      timestamp: new Date().toISOString()
    });
  },

  ipBlocked: (ip: string, reason: string, blockedUntil: Date) => {
    logger.error('IP blocked', {
      type: 'IP_BLOCKED',
      ip,
      reason,
      blockedUntil: blockedUntil.toISOString(),
      timestamp: new Date().toISOString()
    });
  }
};

export const chatLogger = {
  sessionStarted: (sessionId: string, ip: string) => {
    logger.info('Chat session started', {
      type: 'CHAT_SESSION_STARTED',
      sessionId,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  messageReceived: (sessionId: string, stage: string, messageLength: number) => {
    logger.info('Chat message received', {
      type: 'CHAT_MESSAGE_RECEIVED',
      sessionId,
      stage,
      messageLength,
      timestamp: new Date().toISOString()
    });
  },

  sessionCompleted: (sessionId: string, messageCount: number, duration: number) => {
    logger.info('Chat session completed', {
      type: 'CHAT_SESSION_COMPLETED',
      sessionId,
      messageCount,
      durationMs: duration,
      timestamp: new Date().toISOString()
    });
  },

  telegramSent: (sessionId: string, success: boolean, error?: string) => {
    logger.info('Telegram notification sent', {
      type: 'TELEGRAM_NOTIFICATION',
      sessionId,
      success,
      error,
      timestamp: new Date().toISOString()
    });
  }
};

// Экспортируем основной логгер как default
export default logger; 