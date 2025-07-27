import { ChatSession, ChatStartRequest, ChatMessageRequest, ChatResponse } from '../types/chat.types';
export declare class ChatService {
    private sessions;
    private openaiService;
    private telegramService;
    private maxMessageLength;
    private chatTimeout;
    constructor();
    startChat(request: ChatStartRequest, ip: string): Promise<ChatResponse>;
    sendMessage(request: ChatMessageRequest): Promise<ChatResponse>;
    private processUserMessage;
    private completeChat;
    private validateMessage;
    private isSessionExpired;
    private cleanupOldSessions;
    getActiveSessionsCount(): number;
    getSessionInfo(sessionId: string): ChatSession | undefined;
    forceCompleteSession(sessionId: string): Promise<boolean>;
    blockSession(sessionId: string): boolean;
}
//# sourceMappingURL=chat.service.d.ts.map