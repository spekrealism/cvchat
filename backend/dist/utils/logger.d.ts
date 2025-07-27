import winston from 'winston';
export declare const logger: winston.Logger;
export declare const securityLogger: {
    rateLimitHit: (ip: string, endpoint: string, remaining: number) => void;
    rateLimitExceeded: (ip: string, endpoint: string) => void;
    honeypotTriggered: (ip: string, field: string, value: string) => void;
    suspiciousActivity: (ip: string, reason: string, details: any) => void;
    ipBlocked: (ip: string, reason: string, blockedUntil: Date) => void;
};
export declare const chatLogger: {
    sessionStarted: (sessionId: string, ip: string) => void;
    messageReceived: (sessionId: string, stage: string, messageLength: number) => void;
    sessionCompleted: (sessionId: string, messageCount: number, duration: number) => void;
    telegramSent: (sessionId: string, success: boolean, error?: string) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map