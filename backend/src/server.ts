import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ChatController } from './controllers/chat.controller';
import { rateLimiterMiddleware, securityLogger } from './middleware/rateLimiter';
import { securityMiddleware, ipValidationMiddleware } from './middleware/security.middleware';
import { logger } from './utils/logger';

// Загружаем переменные окружения
dotenv.config();

logger.info('🔧 Переменные окружения загружены');

const app = express();
const port = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

logger.info('⚙️ Настройка Express приложения...');

// Базовая настройка безопасности
app.use(helmet({
  contentSecurityPolicy: false, // Отключаем для разработки
  crossOriginEmbedderPolicy: false
}));

logger.info('🛡️ Helmet настроен');

// CORS настройка
const corsOptions = {
  origin: isDevelopment 
    ? ['http://localhost:5173', 'http://localhost:3000']
    : process.env.CORS_ORIGIN?.split(',') || false,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

logger.info('🌐 CORS настроен');

// Middleware для парсинга JSON
app.use(express.json({ 
  limit: '1mb',
  strict: true
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '1mb'
}));

logger.info('📝 JSON middleware настроен');

// Логирование всех запросов
app.use(securityLogger);

// Дополнительные проверки безопасности
app.use(securityMiddleware);
app.use(ipValidationMiddleware);

logger.info('🔍 Security middleware настроен');

// Создаем контроллер
logger.info('🎮 Создание ChatController...');
try {
  const chatController = new ChatController();
  logger.info('✅ ChatController создан успешно');

  // Публичные маршруты (без rate limiting)
  app.get('/health', chatController.healthCheck);
  app.get('/stats', chatController.getStats);

  // Защищенные маршруты чата (с rate limiting)
  app.post('/api/chat/start', chatController.startChat);
  app.post('/api/chat/message', rateLimiterMiddleware, chatController.sendMessage);

  // AG-UI совместимый endpoint
  app.post('/awp', rateLimiterMiddleware, chatController.runAgent);

  logger.info('🛣️ Маршруты настроены');

} catch (error: any) {
  logger.error('❌ Ошибка создания ChatController:', {
    message: error.message,
    stack: error.stack
  });
  throw error;
}

// Обработка ошибок 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Маршрут не найден',
    path: req.originalUrl
  });
});

// Глобальный обработчик ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Необработанная ошибка: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера'
  });
});

// Обработка неперехваченных промисов
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Неперехваченное отклонение промиса:', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
  console.error('UNHANDLED REJECTION:', reason);
});

// Обработка неперехваченных исключений
process.on('uncaughtException', (error: Error) => {
  logger.error('Неперехваченное исключение:', {
    message: error.message,
    stack: error.stack
  });
  console.error('UNCAUGHT EXCEPTION:', error);
  
  // Graceful shutdown
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM получен, завершаем сервер...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT получен, завершаем сервер...');
  process.exit(0);
});

logger.info('🚀 Запуск сервера...');

// Запуск сервера
app.listen(port, () => {
  logger.info(`🚀 Сервер запущен на порту ${port}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔒 CORS origins: ${JSON.stringify(corsOptions.origin)}`);
  
  if (isDevelopment) {
    logger.info(`📖 API документация:`);
    logger.info(`   POST /api/chat/start - Начать чат`);
    logger.info(`   POST /api/chat/message - Отправить сообщение`);
    logger.info(`   POST /awp - AG-UI endpoint`);
    logger.info(`   GET  /health - Health check`);
    logger.info(`   GET  /stats - Статистика`);
  }
}).on('error', (error: any) => {
  logger.error('❌ Ошибка запуска сервера:', {
    message: error.message,
    stack: error.stack,
    code: error.code
  });
  console.error('SERVER ERROR:', error);
});

logger.info('🔚 Конец инициализации сервера');

export default app; 