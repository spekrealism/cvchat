export enum ChatStage {
  GREETING = 'greeting',
  TERMS_AGREEMENT = 'terms_agreement',
  WAITING_CONTACT_INFO = 'waiting_contact_info',
  FIRST_CHAT_COMPLETE = 'first_chat_complete',
  SECOND_CHAT_PRESENTATION = 'second_chat_presentation',
  AGENT_MODE = 'agent_mode',
  USER_RESPONSE = 'user_response',
  AI_CLARIFICATION = 'ai_clarification', 
  FINAL_RESPONSE = 'final_response',
  PROCESSING = 'processing',
  BLOCKED = 'blocked',
  COMPLETED = 'completed'
}

export interface ChatSession {
  id: string;
  ip: string;
  stage: ChatStage;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
  isBlocked: boolean;
  tempUserData?: {
    name?: string;
    contact?: string;
    agreedToTerms?: boolean;
  };
  metadata?: {
    userAgent?: string;
    fingerprint?: string;
    location?: string;
    language?: 'ru' | 'en';
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
  honeypot?: string; // Поле-ловушка для ботов
  formFillTime?: number; // Время заполнения формы
  language?: 'ru' | 'en';
}

export interface ChatMessageRequest {
  sessionId: string;
  message: string;
  formFillTime?: number;
  fingerprint?: string; // Фингерпринт может быть передан после согласия
}

export interface ChatButton {
  id: string;
  text: string;
  value: string;
  variant?: 'primary' | 'secondary';
}

export interface ChatResponse {
  success: boolean;
  sessionId: string;
  message?: string;
  messages?: string[]; // Для отправки нескольких сообщений подряд
  buttons?: ChatButton[]; // Кнопки для пользователя
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

// AG-UI интеграция
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