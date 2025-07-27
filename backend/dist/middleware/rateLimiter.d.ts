import { Request, Response, NextFunction } from 'express';
import { RateLimitInfo } from '../types/chat.types';
interface ExtendedRequest extends Request {
    rateLimitInfo?: RateLimitInfo;
    realIP?: string;
}
export declare const rateLimiterMiddleware: (req: ExtendedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const securityLogger: (req: ExtendedRequest, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map