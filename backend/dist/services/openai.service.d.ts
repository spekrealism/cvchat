import { ChatMessage, ChatStage } from '../types/chat.types';
export declare class OpenAIService {
    private client;
    private model;
    private systemPrompt;
    constructor();
    generateResponse(messages: ChatMessage[], stage: ChatStage): Promise<string>;
    generateStreamingResponse(messages: ChatMessage[], stage: ChatStage, onChunk: (chunk: string) => void, onComplete: () => void, onError: (error: Error) => void): Promise<void>;
    private buildSystemPrompt;
    private getFallbackResponse;
    validateApiKey(): Promise<boolean>;
}
//# sourceMappingURL=openai.service.d.ts.map