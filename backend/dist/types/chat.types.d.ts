export declare enum ChatStage {
    GREETING = "greeting",
    USER_RESPONSE = "user_response",
    AI_CLARIFICATION = "ai_clarification",
    FINAL_RESPONSE = "final_response",
    PROCESSING = "processing",
    BLOCKED = "blocked",
    COMPLETED = "completed"
}
export interface ChatSession {
    id: string;
    ip: string;
    stage: ChatStage;
    messages: ChatMessage[];
    createdAt: Date;
    lastActivity: Date;
    isBlocked: boolean;
    metadata?: {
        userAgent?: string;
        fingerprint?: string;
        location?: string;
    };
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    stage: ChatStage;
}
export interface ChatStartRequest {
    sessionId?: string;
    userAgent?: string;
    fingerprint?: string;
    honeypot?: string;
    formFillTime?: number;
}
export interface ChatMessageRequest {
    sessionId: string;
    message: string;
    formFillTime?: number;
}
export interface ChatResponse {
    success: boolean;
    sessionId: string;
    message?: string;
    stage: ChatStage;
    isCompleted?: boolean;
    isBlocked?: boolean;
    error?: string;
}
export interface RateLimitInfo {
    ip: string;
    hits: number;
    windowStart: Date;
    blockedUntil?: Date;
}
export interface TelegramNotification {
    sessionId: string;
    messages: ChatMessage[];
    userInfo: {
        ip: string;
        userAgent?: string;
        fingerprint?: string;
    };
}
export interface AGUIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface AGUIRunRequest {
    threadId: string;
    runId: string;
    messages: AGUIMessage[];
}
export interface AGUIEvent {
    type: string;
    threadId: string;
    runId?: string;
    messageId?: string;
    role?: string;
    delta?: string;
    data?: any;
}
export interface SecurityConfig {
    rateLimitRequests: number;
    rateLimitWindowHours: number;
    rateLimitBlockHours: number;
    maxMessageLength: number;
    minFormFillTime: number;
    maxFormFillTime: number;
    honeypotFieldName: string;
}
//# sourceMappingURL=chat.types.d.ts.map