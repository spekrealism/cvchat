# 💬 Chat with Business Card - Complete Guide

Mini-application chat with AI agent, Telegram integration and abuse protection.

## 🎯 What's Implemented

### ✅ Backend (Express + TypeScript)
- **Rate Limiting**: 2 requests per 2 hours per IP
- **AG-UI Protocol**: Compatibility with Agent User Interaction Protocol
- **OpenAI Integration**: Smart dialogue with AI
- **Telegram Bot**: Automatic notification sending
- **Anti-abuse**: Honeypot, timing analysis, IP blocking
- **Security**: CORS, Helmet, data validation
- **Logging**: Detailed logs with Winston

### ✅ Frontend (SvelteKit)
- **Beautiful UI**: Modern design with animations
- **Dialogue Scenario**: Greeting → Response → Clarification → Final
- **Typing Effect**: Live communication simulation
- **Responsive**: Adaptive design for mobile
- **Error Handling**: Handling all errors
- **Rate Limit UI**: Informing about limits

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. .env Configuration

Copy missing secrets from `env.example` to your `.env`:

```bash
# AI
OPENAI_API_KEY=your_openai_key_here
AI_MODEL=gpt-3.5-turbo

# Telegram (you already have)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Backend Configuration
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_REQUESTS=2
RATE_LIMIT_WINDOW_HOURS=2
RATE_LIMIT_BLOCK_HOURS=24
RATE_LIMIT_MAX_HITS=5

# Security
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=super-secret-jwt-key-change-in-production-2024
SESSION_SECRET=ultra-secure-session-secret-key-for-production
ENCRYPTION_KEY=32-char-encryption-key-for-data

# Anti-abuse
HONEYPOT_FIELD_NAME=website_url_dont_fill
MIN_FORM_FILL_TIME=3000
MAX_FORM_FILL_TIME=600000
CAPTCHA_SECRET_KEY=your-captcha-secret-key-here

# Chat Configuration
CHAT_TIMEOUT_MS=300000
MAX_MESSAGE_LENGTH=2000
SYSTEM_PROMPT="You are an assistant on a developer's business card website. Be friendly and professional."

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 3. Start Backend

```bash
cd backend
npm run dev
```

Server will start on `http://localhost:3000`

### 4. Start Frontend

```bash
cd frontend  
npm run dev
```

Frontend will be available at `http://localhost:5173`

## 📋 Workflow Scenario

### 1️⃣ Greeting Stage
- User navigates to `/chat`
- AI generates greeting: "Hello! How can I help you?"

### 2️⃣ User Response
- User describes their request
- Message is sent to backend

### 3️⃣ AI Clarification
- AI asks clarifying questions
- Analyzes user needs

### 4️⃣ Final Response
- AI gives detailed answer
- Chat gets blocked
- Notification is sent to Telegram

### 5️⃣ Completion
- Completion message is shown
- User cannot continue dialogue

## 🛡️ Abuse Protection

### Rate Limiting
- **2 requests per 2 hours** per IP
- **24-hour blocking** when exceeded
- Whitelist for local IPs in development

### Honeypot Protection
- Hidden field `website_url_dont_fill`
- Automatic blocking when filled

### Timing Analysis
- Form fill time tracking
- Blocking too fast responses
- Min: 3 seconds, Max: 10 minutes

### Additional Security
- Validation of all input data
- User-Agent bot checking
- Suspicious activity logging
- CORS protection
- Helmet middleware

## 📡 API Endpoints

### Standard API

#### `POST /api/chat/start`
Start new chat

**Request:**
```json
{
  "fingerprint": "browser_fingerprint",
  "formFillTime": 5000
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "message": "Greeting message",
  "stage": "user_response"
}
```

#### `POST /api/chat/message`
Send message

**Request:**
```json
{
  "sessionId": "uuid",
  "message": "Message text",
  "formFillTime": 15000
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "message": "AI response",
  "stage": "ai_clarification",
  "isCompleted": false
}
```

### AG-UI Protocol

#### `POST /awp`
AG-UI compatible endpoint with Server-Sent Events

**Request:**
```json
{
  "threadId": "thread-uuid",
  "runId": "run-uuid", 
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Hello!"
    }
  ]
}
```

**Response:** SSE stream with events:
```
data: {"type":"RUN_STARTED","threadId":"...","runId":"..."}

data: {"type":"TEXT_MESSAGE_START","messageId":"...","role":"assistant"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"...","delta":"Hello!"}

data: {"type":"TEXT_MESSAGE_END","messageId":"..."}

data: {"type":"RUN_FINISHED","threadId":"...","runId":"..."}
```

### Monitoring

#### `GET /health`
Server health check

#### `GET /stats`
Active sessions statistics

## 🔧 Configuration

### Rate Limits Setup
In `.env` you can change:
- `RATE_LIMIT_REQUESTS` - number of requests
- `RATE_LIMIT_WINDOW_HOURS` - time window
- `RATE_LIMIT_BLOCK_HOURS` - blocking time

### AI Setup
- `AI_MODEL` - OpenAI model
- `SYSTEM_PROMPT` - system prompt
- `MAX_MESSAGE_LENGTH` - max message length

### Security Setup
- `MIN_FORM_FILL_TIME` - min form fill time
- `MAX_FORM_FILL_TIME` - max form fill time
- `HONEYPOT_FIELD_NAME` - honeypot field name

## 📱 Telegram Integration

When chat is completed, notification is sent:

```
💬 New chat request

🆔 Session: abc12345...
🕐 Time: 25.03.2024, 14:30:15
🌍 IP: 192.168.1.100
📱 User Agent: Mozilla/5.0...

📝 Dialogue:
----------------------------------------

👤 User:
Hello! I want to order a website

--------------------

🤖 Assistant:
Great! What kind of website are you interested in?

--------------------

👤 User:
Online store for clothing

----------------------------------------

✉️ Reply to this message to contact the user
```

## 📊 Logging

All actions are logged:

### Security Events
- Rate limit exceedings
- Honeypot triggers
- Suspicious activity
- IP blockings

### Chat Events
- Session starts
- Message receiving
- Chat completions
- Telegram sending

### Log Files (in production)
- `logs/app.log` - general logs
- `logs/error.log` - errors
- `logs/exceptions.log` - exceptions

## 🚀 Deployment

### Docker Compose
Production configuration is in `docker-compose.yml` file.
During deployment via GitHub Actions, `.env` file will be automatically created on server using secrets configured in repository.

```yaml
version: '3'

services:
  frontend:
    image: ghcr.io/${{ github.repository }}/frontend:latest # Using image from GHCR
    restart: always
    ports:
      - "3000:3000"
    networks:
      - app-network
    depends_on:
      - backend
  
  backend:
    image: ghcr.io/${{ github.repository }}/backend:latest # Using image from GHCR
    restart: always
    ports:
      - "3001:3000"
    env_file:
      - .env # Using .env file for environment variables
    networks:
      - app-network

  nginx:
    image: nginx:stable
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge 
```

### Nginx Configuration
Update `nginx/nginx.conf`:

```nginx
upstream frontend {
  server frontend:3000;
}

upstream backend {
  server backend:3000;
}

server {
  listen 80;
  
  # Frontend
  location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  
  # Backend API
  location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  
  # AG-UI endpoint
  location /awp {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # SSE settings
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
  }
}
```

## 🐛 Debugging

### Backend Check
```bash
curl http://localhost:3000/health
```

### Rate Limiting Check
```bash
# First request (should pass)
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"formFillTime": 5000}'

# Repeated requests (should be blocked)
```

### Telegram Check
```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"formFillTime": 5000}'
# Complete chat and check Telegram
```

## ⚡ Performance

- **Memory**: ~50MB per session
- **CPU**: Low load, peaks during OpenAI calls
- **Network**: Minimal traffic, optimized requests
- **Storage**: No DB, everything in memory with auto-cleanup

## 🔮 Possible Improvements

1. **Redis** for rate limiting in production
2. **Database** for persistent session storage
3. **WebSocket** for real-time updates
4. **CAPTCHA** for suspicious activity
5. **Analytics** dashboard for monitoring
6. **A/B tests** for conversion optimization

---

## 🎉 Ready to Use!

Your chat application is fully ready. Simply:

1. Fill in `.env` file
2. Run `npm run dev` in `backend/`
3. Open `http://localhost:5173/chat`
4. Enjoy smart chat! 🚀 