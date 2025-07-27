"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const chat_controller_1 = require("./controllers/chat.controller");
const rateLimiter_1 = require("./middleware/rateLimiter");
const logger_1 = require("./utils/logger");
// Загружаем переменные окружения
dotenv_1.default.config();
logger_1.logger.info('🔧 Переменные окружения загружены');
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';
logger_1.logger.info('⚙️ Настройка Express приложения...');
// Базовая настройка безопасности
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Отключаем для разработки
    crossOriginEmbedderPolicy: false
}));
logger_1.logger.info('🛡️ Helmet настроен');
// CORS настройка
const corsOptions = {
    origin: isDevelopment
        ? ['http://localhost:5177', 'http://localhost:3000']
        : process.env.CORS_ORIGIN?.split(',') || false,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use((0, cors_1.default)(corsOptions));
logger_1.logger.info('🌐 CORS настроен');
// Middleware для парсинга JSON
app.use(express_1.default.json({
    limit: '10mb',
    strict: true
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '10mb'
}));
logger_1.logger.info('📝 JSON middleware настроен');
// Логирование всех запросов
app.use(rateLimiter_1.securityLogger);
logger_1.logger.info('🔍 Security logger настроен');
// Создаем контроллер
logger_1.logger.info('🎮 Создание ChatController...');
try {
    const chatController = new chat_controller_1.ChatController();
    logger_1.logger.info('✅ ChatController создан успешно');
    // Публичные маршруты (без rate limiting)
    app.get('/health', chatController.healthCheck);
    app.get('/stats', chatController.getStats);
    // Защищенные маршруты чата (с rate limiting)
    app.post('/api/chat/start', rateLimiter_1.rateLimiterMiddleware, chatController.startChat);
    app.post('/api/chat/message', rateLimiter_1.rateLimiterMiddleware, chatController.sendMessage);
    // AG-UI совместимый endpoint
    app.post('/awp', rateLimiter_1.rateLimiterMiddleware, chatController.runAgent);
    logger_1.logger.info('🛣️ Маршруты настроены');
}
catch (error) {
    logger_1.logger.error('❌ Ошибка создания ChatController:', {
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
app.use((err, req, res, next) => {
    logger_1.logger.error(`Необработанная ошибка: ${err.message}`, {
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    res.status(500).json({
        success: false,
        error: isDevelopment ? err.message : 'Внутренняя ошибка сервера'
    });
});
// Обработка неперехваченных промисов
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Неперехваченное отклонение промиса:', {
        reason: reason?.message || reason,
        stack: reason?.stack
    });
    console.error('UNHANDLED REJECTION:', reason);
});
// Обработка неперехваченных исключений
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Неперехваченное исключение:', {
        message: error.message,
        stack: error.stack
    });
    console.error('UNCAUGHT EXCEPTION:', error);
    // Graceful shutdown
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM получен, завершаем сервер...');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT получен, завершаем сервер...');
    process.exit(0);
});
logger_1.logger.info('🚀 Запуск сервера...');
// Запуск сервера
app.listen(port, () => {
    logger_1.logger.info(`🚀 Сервер запущен на порту ${port}`);
    logger_1.logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.logger.info(`🔒 CORS origins: ${JSON.stringify(corsOptions.origin)}`);
    if (isDevelopment) {
        logger_1.logger.info(`📖 API документация:`);
        logger_1.logger.info(`   POST /api/chat/start - Начать чат`);
        logger_1.logger.info(`   POST /api/chat/message - Отправить сообщение`);
        logger_1.logger.info(`   POST /awp - AG-UI endpoint`);
        logger_1.logger.info(`   GET  /health - Health check`);
        logger_1.logger.info(`   GET  /stats - Статистика`);
    }
}).on('error', (error) => {
    logger_1.logger.error('❌ Ошибка запуска сервера:', {
        message: error.message,
        stack: error.stack,
        code: error.code
    });
    console.error('SERVER ERROR:', error);
});
logger_1.logger.info('🔚 Конец инициализации сервера');
exports.default = app;
//# sourceMappingURL=server.js.map