import { TelegramNotification } from '../types/chat.types';
export declare class TelegramService {
    private bot;
    private chatId;
    private isEnabled;
    constructor();
    sendChatNotification(notification: TelegramNotification): Promise<boolean>;
    sendSimpleMessage(text: string): Promise<boolean>;
    sendAlert(title: string, details: string): Promise<boolean>;
    private formatChatMessage;
    private getRoleIcon;
    private getRoleName;
    private escapeHtml;
    testConnection(): Promise<boolean>;
    isConfigured(): boolean;
}
//# sourceMappingURL=telegram.service.d.ts.map