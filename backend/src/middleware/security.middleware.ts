import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Middleware для дополнительных проверок безопасности
export const securityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Проверяем подозрительные заголовки
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-cluster-client-ip'];
  suspiciousHeaders.forEach(header => {
    const value = req.headers[header];
    if (value && typeof value === 'string') {
      // Проверяем на инъекции в заголовках
      if (/[<>\"';&\\]/.test(value)) {
        logger.warn(`Suspicious header value detected: ${header}=${value} from ${req.ip}`);
        res.status(400).json({
          success: false,
          error: 'Недопустимые символы в заголовках'
        });
        return;
      }
    }
  });

  // Устанавливаем дополнительные заголовки безопасности
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // В production также устанавливаем HSTS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

// Middleware для валидации IP адресов
export const ipValidationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Проверяем на валидность IP
  if (!clientIP || clientIP === 'unknown') {
    logger.warn('Request without valid IP address');
    res.status(400).json({
      success: false,
      error: 'Невозможно определить IP адрес'
    });
    return;
  }

  next();
}; 