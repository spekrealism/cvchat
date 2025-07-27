"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogger = exports.rateLimiterMiddleware = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const logger_1 = require("../utils/logger");
// Хранилище для блокированных IP
const blockedIPs = new Map();
const suspiciousIPs = new Map();
// Основной лимитер: 2 запроса в 2 часа
const mainLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: parseInt(process.env.RATE_LIMIT_REQUESTS || '2'),
    duration: parseInt(process.env.RATE_LIMIT_WINDOW_HOURS || '2') * 3600, // в секундах
    blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_HOURS || '24') * 3600,
});
// Лимитер для подозрительной активности: блокировка на 1 час при 5+ попытках
const suspiciousLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: parseInt(process.env.RATE_LIMIT_MAX_HITS || '5'),
    duration: 3600, // 1 час
    blockDuration: 24 * 3600, // 24 часа блокировки
});
function getClientIP(req) {
    return (req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown');
}
function isWhitelisted(ip) {
    const whitelist = ['127.0.0.1', '::1', 'localhost'];
    return whitelist.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.');
}
async function checkHoneypot(req) {
    const honeypotField = process.env.HONEYPOT_FIELD_NAME || 'website_url_dont_fill';
    const honeypotValue = req.body[honeypotField];
    if (honeypotValue && honeypotValue.trim() !== '') {
        logger_1.logger.warn(`Honeypot triggered by IP: ${getClientIP(req)}`);
        return true;
    }
    return false;
}
function checkFormTiming(req) {
    const formFillTime = req.body.formFillTime;
    const minTime = parseInt(process.env.MIN_FORM_FILL_TIME || '3000');
    const maxTime = parseInt(process.env.MAX_FORM_FILL_TIME || '600000');
    if (!formFillTime || formFillTime < minTime || formFillTime > maxTime) {
        logger_1.logger.warn(`Suspicious form timing: ${formFillTime}ms from IP: ${getClientIP(req)}`);
        return false;
    }
    return true;
}
const rateLimiterMiddleware = async (req, res, next) => {
    try {
        const clientIP = getClientIP(req);
        req.realIP = clientIP;
        // Проверяем whitelist для разработки
        if (isWhitelisted(clientIP)) {
            logger_1.logger.debug(`Whitelisted IP: ${clientIP}`);
            return next();
        }
        // Проверяем, не заблокирован ли IP навсегда
        const blockedUntil = blockedIPs.get(clientIP);
        if (blockedUntil && blockedUntil > new Date()) {
            logger_1.logger.warn(`Blocked IP attempted access: ${clientIP}`);
            res.status(429).json({
                success: false,
                error: 'IP заблокирован за подозрительную активность',
                blockedUntil: blockedUntil.toISOString()
            });
            return;
        }
        // Проверяем honeypot
        if (await checkHoneypot(req)) {
            // Немедленно блокируем IP при срабатывании honeypot
            const blockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
            blockedIPs.set(clientIP, blockUntil);
            res.status(429).json({
                success: false,
                error: 'Подозрительная активность обнаружена'
            });
            return;
        }
        // Проверяем время заполнения формы
        if (!checkFormTiming(req)) {
            // Увеличиваем счетчик подозрительной активности
            const currentCount = suspiciousIPs.get(clientIP) || 0;
            suspiciousIPs.set(clientIP, currentCount + 1);
            if (currentCount >= 3) {
                const blockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
                blockedIPs.set(clientIP, blockUntil);
                res.status(429).json({
                    success: false,
                    error: 'Подозрительная активность обнаружена'
                });
                return;
            }
        }
        // Проверяем основной лимитер
        try {
            const resRateLimit = await mainLimiter.consume(clientIP);
            // Добавляем информацию о лимитах в заголовки
            res.set({
                'X-RateLimit-Limit': process.env.RATE_LIMIT_REQUESTS || '2',
                'X-RateLimit-Remaining': String(resRateLimit.remainingPoints || 0),
                'X-RateLimit-Reset': String(new Date(Date.now() + resRateLimit.msBeforeNext))
            });
            req.rateLimitInfo = {
                ip: clientIP,
                hits: parseInt(process.env.RATE_LIMIT_REQUESTS || '2') - (resRateLimit.remainingPoints || 0),
                windowStart: new Date(Date.now() - resRateLimit.msBeforeNext)
            };
            logger_1.logger.info(`Rate limit check passed for IP: ${clientIP}, remaining: ${resRateLimit.remainingPoints}`);
            next();
        }
        catch (rejRes) {
            // Лимит превышен
            logger_1.logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
            // Проверяем подозрительный лимитер
            try {
                await suspiciousLimiter.consume(clientIP);
            }
            catch (suspiciousRejRes) {
                // Слишком много попыток - блокируем надолго
                const blockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
                blockedIPs.set(clientIP, blockUntil);
                logger_1.logger.error(`IP ${clientIP} blocked for 24 hours due to excessive attempts`);
                res.status(429).json({
                    success: false,
                    error: 'IP заблокирован за множественные нарушения лимитов',
                    blockedUntil: blockUntil.toISOString()
                });
                return;
            }
            const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
            res.set('Retry-After', String(secs));
            res.status(429).json({
                success: false,
                error: `Превышен лимит запросов. Попробуйте через ${Math.ceil(secs / 3600)} часов.`,
                retryAfter: secs
            });
        }
    }
    catch (error) {
        logger_1.logger.error(`Rate limiter error: ${error}`);
        // В случае ошибки лимитера - пропускаем запрос
        next();
    }
};
exports.rateLimiterMiddleware = rateLimiterMiddleware;
// Middleware для логирования подозрительной активности
const securityLogger = (req, res, next) => {
    const userAgent = req.headers['user-agent'];
    const referer = req.headers.referer;
    const clientIP = req.realIP || getClientIP(req);
    // Проверяем на подозрительные User-Agent
    const suspiciousUAs = ['bot', 'crawler', 'spider', 'scraper'];
    if (userAgent && suspiciousUAs.some(ua => userAgent.toLowerCase().includes(ua))) {
        logger_1.logger.warn(`Suspicious User-Agent from ${clientIP}: ${userAgent}`);
    }
    // Логируем все запросы для анализа
    logger_1.logger.info(`Request: ${req.method} ${req.path} from ${clientIP}`, {
        userAgent,
        referer,
        body: req.method === 'POST' ? req.body : undefined
    });
    next();
};
exports.securityLogger = securityLogger;
//# sourceMappingURL=rateLimiter.js.map