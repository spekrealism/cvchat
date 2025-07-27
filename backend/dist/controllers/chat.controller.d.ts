import { Request, Response } from 'express';
export declare class ChatController {
    private chatService;
    constructor();
    startChat: (req: Request, res: Response) => Promise<void>;
    sendMessage: (req: Request, res: Response) => Promise<void>;
    runAgent: (req: Request, res: Response) => Promise<void>;
    getStats: (req: Request, res: Response) => Promise<void>;
    healthCheck: (req: Request, res: Response) => Promise<void>;
    private streamMessage;
    private getClientIP;
    private generateMessageId;
}
//# sourceMappingURL=chat.controller.d.ts.map