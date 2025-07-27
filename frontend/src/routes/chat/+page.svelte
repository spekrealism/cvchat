<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { currentLanguage } from '$lib/i18n';
  import { fly, fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // Типы
  interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
    isTyping?: boolean;
  }

  interface ChatButton {
    id: string;
    text: string;
    value: string;
    variant?: 'primary' | 'secondary';
  }

  // Заменяем enum на const assertions для Svelte
  const ChatStage = {
    LOADING: 'loading',
    GREETING: 'greeting',
    USER_RESPONSE: 'user_response',
    AI_CLARIFICATION: 'ai_clarification',
    FINAL_RESPONSE: 'final_response',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    BLOCKED: 'blocked',
    ERROR: 'error'
  } as const;

  type ChatStageType = typeof ChatStage[keyof typeof ChatStage];

  // Состояние
  let messages: ChatMessage[] = [];
  let currentStage: ChatStageType = ChatStage.LOADING;
  let sessionId = '';
  let userInput = '';
  let isLoading = false;
  let isTyping = false;
  let isBlocked = false;
  let formStartTime = 0;
  let showPage = false;
  let error = '';
  let availableButtons: ChatButton[] = [];
  let userFingerprint = ''; // Будет сгенерирован после согласия

  // DOM элементы
  let chatContainer: HTMLDivElement;
  let messageInput: HTMLTextAreaElement; // Исправлено на HTMLTextAreaElement

  // API базовый URL
  // const API_BASE = 'http://localhost:3000/api';
  const API_BASE = '/api';

  onMount(() => {
    showPage = true;
    startChat();
  });

  async function startChat() {
    try {
      isLoading = true;
      currentStage = ChatStage.LOADING;

      const response = await fetch(`${API_BASE}/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Фингерпринт не отправляем - он будет сгенерирован после согласия
          language: get(currentLanguage)
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Не удалось начать чат');
      }

      sessionId = data.sessionId;
      currentStage = ChatStage.GREETING;

      // Проверяем, есть ли множественные сообщения
      if (data.messages && data.messages.length > 0) {
        // Добавляем все сообщения друг за другом с эффектом печатания
        for (const message of data.messages) {
          await addTypingMessage('assistant', message);
          // Небольшая пауза между сообщениями
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else if (data.message) {
        // Добавляем одно приветственное сообщение с эффектом печатания
        await addTypingMessage('assistant', data.message);
      }

      // Обрабатываем кнопки если есть
      if (data.buttons && data.buttons.length > 0) {
        availableButtons = data.buttons;
      } else {
        availableButtons = [];
      }
      
      currentStage = ChatStage.USER_RESPONSE;
      
      // Теперь пользователь может начать печатать - запускаем отсчет времени
      formStartTime = Date.now();

    } catch (err: any) {
      error = err.message;
      currentStage = ChatStage.ERROR;
    } finally {
      isLoading = false;
    }
  }

  async function sendMessage() {
    if (!userInput.trim() || isLoading || isBlocked) return;

    const message = userInput.trim();
    userInput = '';
    formStartTime = Date.now();

    // Добавляем сообщение пользователя
    addMessage('user', message);
    
    try {
      isLoading = true;
      currentStage = ChatStage.PROCESSING;

      const requestBody: any = {
        sessionId,
        message,
        formFillTime: Date.now() - formStartTime
      };

      // Добавляем фингерпринт если он уже сгенерирован
      if (userFingerprint) {
        requestBody.fingerprint = userFingerprint;
      }

      const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!data.success) {
        if (data.isBlocked) {
          isBlocked = true;
          currentStage = ChatStage.BLOCKED;
          await addTypingMessage('assistant', 'Чат завершен. Спасибо за ваш запрос!');
          return;
        }
        throw new Error(data.error || 'Ошибка отправки сообщения');
      }

      // Добавляем ответ ИИ с эффектом печатания
      if (data.messages && data.messages.length > 0) {
        // Обрабатываем множественные сообщения
        for (const message of data.messages) {
          await addTypingMessage('assistant', message);
          // Небольшая пауза между сообщениями
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else if (data.message) {
        await addTypingMessage('assistant', data.message);
      }
      
      if (data.isCompleted) {
        currentStage = ChatStage.COMPLETED;
        isBlocked = true;
        
        // Показываем финальное сообщение
        setTimeout(async () => {
          await addTypingMessage('assistant', 
            '✨ Запрос передан разработчику! Ожидайте связи в ближайшее время.'
          );
        }, 1000);
      } else {
        currentStage = data.stage === 'ai_clarification' 
          ? ChatStage.AI_CLARIFICATION 
          : ChatStage.USER_RESPONSE;
      }

    } catch (err: any) {
      error = err.message;
      await addTypingMessage('assistant', 
        'Извините, произошла ошибка. Попробуйте позже или обновите страницу.'
      );
    } finally {
      isLoading = false;
    }
  }

  async function handleButtonClick(button: ChatButton) {
    if (isLoading || isBlocked) return;

    // Если это согласие (кнопка "Да"), генерируем фингерпринт
    if (button.id === 'agree' && !userFingerprint) {
      userFingerprint = generateFingerprint();
    }

    // Добавляем сообщение пользователя
    addMessage('user', button.text);
    
    // Очищаем кнопки
    availableButtons = [];
    
    try {
      isLoading = true;
      currentStage = ChatStage.PROCESSING;

      const requestBody: any = {
        sessionId,
        message: button.value,
        formFillTime: Date.now() - formStartTime
      };

      // Добавляем фингерпринт если он уже сгенерирован
      if (userFingerprint) {
        requestBody.fingerprint = userFingerprint;
      }

      const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!data.success) {
        if (data.isBlocked) {
          isBlocked = true;
          currentStage = ChatStage.BLOCKED;
          await addTypingMessage('assistant', 'Чат завершен. Спасибо за ваш запрос!');
          return;
        }
        throw new Error(data.error || 'Ошибка отправки сообщения');
      }

      // Добавляем ответ ИИ с эффектом печатания
      if (data.messages && data.messages.length > 0) {
        // Обрабатываем множественные сообщения
        for (const message of data.messages) {
          await addTypingMessage('assistant', message);
          // Небольшая пауза между сообщениями
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else if (data.message) {
        await addTypingMessage('assistant', data.message);
      }

      // Обрабатываем новые кнопки если есть
      if (data.buttons && data.buttons.length > 0) {
        availableButtons = data.buttons;
      }
      
      if (data.isCompleted) {
        currentStage = ChatStage.COMPLETED;
        isBlocked = true;
        
        // Показываем финальное сообщение
        setTimeout(async () => {
          await addTypingMessage('assistant', 
            '✨ Запрос передан разработчику! Ожидайте связи в ближайшее время.'
          );
        }, 1000);
      } else {
        currentStage = data.stage === 'ai_clarification' 
          ? ChatStage.AI_CLARIFICATION 
          : ChatStage.USER_RESPONSE;
      }

    } catch (err: any) {
      error = err.message;
      await addTypingMessage('assistant', 
        'Извините, произошла ошибка. Попробуйте позже или обновите страницу.'
      );
    } finally {
      isLoading = false;
    }
  }

  function addMessage(role: 'user' | 'assistant', content: string) {
    const message: ChatMessage = {
      id: Math.random().toString(36).substring(2, 15),
      role,
      content
    };
    
    messages = [...messages, message];
    scrollToBottom();
  }

  async function addTypingMessage(role: 'user' | 'assistant', content: string) {
    const messageId = Math.random().toString(36).substring(2, 15);
    
    // Добавляем пустое сообщение с индикатором печатания
    const typingMessage: ChatMessage = {
      id: messageId,
      role,
      content: '',
      isTyping: true
    };
    
    messages = [...messages, typingMessage];
    scrollToBottom();
    
    // Имитируем печатание
    await simulateTyping(messageId, content);
  }

  async function simulateTyping(messageId: string, content: string) {
    let currentText = '';
    const typingSpeed = 10; // мс на символ, можно настроить

    for (let i = 0; i < content.length; i++) {
      currentText += content[i];
      
      messages = messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: currentText }
          : msg
      );
      
      scrollToBottom();
      
      // Задержка между символами
      await new Promise(resolve => setTimeout(resolve, typingSpeed + Math.random() * 20));
    }
    
    // Убираем индикатор печатания
    messages = messages.map(msg => 
      msg.id === messageId 
        ? { ...msg, isTyping: false }
        : msg
    );
  }

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function generateFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint', 2, 2);
    }
    return canvas.toDataURL().slice(-50);
  }

  function goBack() {
    showPage = false;
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  }

  function restartChat() {
    messages = [];
    userInput = '';
    isBlocked = false;
    error = '';
    sessionId = '';
    userFingerprint = ''; // Очищаем фингерпринт
    availableButtons = [];
    currentStage = ChatStage.LOADING; 
    startChat(); 
  }

  function getStageText(stage: ChatStageType): string {
    switch (stage) {
      case ChatStage.LOADING: return 'Инициализация чата...';
      case ChatStage.GREETING: return 'Приветствие';
      case ChatStage.USER_RESPONSE: return 'Ваш ответ';
      case ChatStage.AI_CLARIFICATION: return 'Уточнение деталей';
      case ChatStage.FINAL_RESPONSE: return 'Финальный ответ';
      case ChatStage.PROCESSING: return 'Обработка запроса...';
      case ChatStage.COMPLETED: return 'Чат завершен';
      case ChatStage.BLOCKED: return 'Заблокировано';
      case ChatStage.ERROR: return 'Ошибка';
      default: return '';
    }
  }
</script>

{#if showPage}
<main in:fly={{ x: -1000, duration: 500 }} out:fly={{ x: 1000, duration: 500 }}>
  <div class="chat-container">
    <!-- Шапка чата -->
    <header class="chat-header">
      <button class="back-button" on:click={goBack}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Назад
      </button>
      
      <div class="chat-status">
        <div class="status-indicator" class:active={!isBlocked && !error} class:blocked={isBlocked} class:error={error}></div>
        <span class="status-text">{getStageText(currentStage)}</span>
      </div>
    </header>

    <!-- Область сообщений -->
    <div class="messages-container" bind:this={chatContainer}>
      {#if currentStage === ChatStage.LOADING}
        <div class="loading-container" in:fade={{ duration: 300 }}>
          <div class="loading-spinner"></div>
          <p>Подготавливаем чат...</p>
        </div>
      {:else}
        {#each messages as message (message.id)}
          <div 
            class="message {message.role}" 
            in:fly={{ y: 50, duration: 300, easing: quintOut }}
          >
            <div class="message-content">
              <div class="message-text">
                {message.content}
                {#if message.isTyping}
                  <span class="typing-cursor" in:fade={{ duration: 200 }}>|</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}

        <!-- Кнопки для пользователя -->
        {#if availableButtons.length > 0 && !isLoading}
          <div class="chat-buttons" in:fly={{ y: 20, duration: 300 }}>
            {#each availableButtons as button (button.id)}
              <button 
                class="chat-button {button.variant || 'secondary'}"
                on:click={() => handleButtonClick(button)}
                in:scale={{ duration: 200, delay: 100 }}
              >
                {button.text}
              </button>
            {/each}
          </div>
        {/if}

        {#if isLoading && currentStage === ChatStage.PROCESSING}
          <div class="message assistant processing" in:fade={{ duration: 300 }}>
            <div class="message-content">
              <div class="processing-animation">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
              <div class="message-text">Анализирую ваш запрос...</div>
            </div>
          </div>
        {/if}
      {/if}

      {#if error}
        <div class="error-message" in:scale={{ duration: 300 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>{error}</span>
        </div>
      {/if}
    </div>

    <!-- Поле ввода -->
    <div class="input-container" class:disabled={isLoading || error || isBlocked}>
      {#if isBlocked && !error}
        <div class="completion-message">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22,4 12,14.01 9,11.01"></polyline>
          </svg>
          <span>Запрос отправлен! Скоро с вами свяжутся.</span>
          <button class="new-chat-button" on:click={restartChat}>
            Начать новый чат
          </button>
        </div>
      {:else if !error}
        <div class="input-wrapper">
          <textarea 
            bind:this={messageInput}
            bind:value={userInput}
            placeholder={currentStage === ChatStage.USER_RESPONSE ? "Напишите ваш запрос..." : "Ваш ответ..."}
            on:keydown={handleKeyPress}
            disabled={isLoading}
            maxlength="2000"
            rows="1"
          ></textarea>
          
          <button 
            class="send-button" 
            on:click={sendMessage}
            disabled={!userInput.trim() || isLoading}
            class:loading={isLoading}
          >
            {#if isLoading}
              <div class="spinner"></div>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="20" viewBox="1.5 -0.5 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
            {/if}
          </button>
        </div>
        
        <div class="input-hint">
          {#if userInput.length > 1900}
            <span class="warning">Осталось символов: {2000 - userInput.length}</span>
          {:else}
            <span>Нажмите Enter для отправки</span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Honeypot field (скрытое поле-ловушка) -->
    <input type="text" name="website_url_dont_fill" style="display: none;" tabindex="-1" autocomplete="off">
  </div>
</main>
{/if}

<style>
  main {
    width: 100%;
    height: 100vh;
    background-color: #fafafa;
    font-family: 'Montserrat', 'Arial', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .chat-container {
    width: 100%;
    max-width: 800px;
    height: 90vh;
    max-height: 700px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e6f7f7;
  }

  .chat-header {
    padding: 1.5rem;
    background-color: #2b4f4f;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .back-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    font-family: inherit;
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateX(-2px);
  }

  .chat-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #95a5a6;
    transition: all 0.3s ease;
  }

  .status-indicator.active {
    background: #27ae60;
    box-shadow: 0 0 8px rgba(39, 174, 96, 0.4);
  }

  .status-indicator.blocked {
    background: #f39c12;
  }

  .status-indicator.error {
    background: #e74c3c;
  }

  .status-text {
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .messages-container {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background-color: #fafafa;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #7f8c8d;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #ecf0f1;
    border-top: 3px solid #2b4f4f;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  .message {
    display: flex;
    margin-bottom: 0.5rem;
  }

  .message.user {
    justify-content: flex-end;
  }

  .message.assistant {
    justify-content: flex-start;
  }

  .message-content {
    max-width: 70%;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .message-text {
    padding: 0.5rem 0.7rem;
    border-radius: 12px;
    line-height: 1.5;
    position: relative;
    white-space: pre-wrap;
  }

  .message.user .message-text {
    background-color: #2b4f4f;
    color: white;
    border-bottom-right-radius: 4px;
  }

  .message.assistant .message-text {
    background: white;
    color: #333;
    border-bottom-left-radius: 4px;
    border: 1px solid #e6f7f7;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  .typing-cursor {
    color: #2b4f4f;
    font-weight: bold;
    animation: blink 1s infinite;
  }

  .processing {
    animation: pulse 2s infinite;
  }

  .processing-animation {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 0.5rem;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: #2b4f4f;
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite both;
  }

  .dot:nth-child(2) {
    animation-delay: -0.32s;
  }

  .dot:nth-child(3) {
    animation-delay: -0.16s;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 8px;
    color: #e74c3c;
    margin: 1rem 0;
  }

  .input-container {
    padding: 1.5rem;
    border-top: 1px solid #e6f7f7;
    background: white;
  }

  .input-container.disabled {
    opacity: 0.6;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #fafafa;
    border: 2px solid #e6f7f7;
    border-radius: 12px;
    padding: 0.5rem;
    transition: all 0.3s ease;
  }

  .input-wrapper:focus-within {
    border-color: #2b4f4f;
    box-shadow: 0 0 0 3px rgba(43, 79, 79, 0.1);
  }

  textarea {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
    font-size: 0.95rem;
    line-height: 1.4;
    max-height: 120px;
    min-height: 16px;
    background: transparent;
    color: #333;
  }

  textarea::placeholder {
    color: #95a5a6;
  }

  .send-button {
    width: 30px;
    height: 30px;
    border: none;
    background-color: #2b4f4f;
    color: white;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  .send-button:hover:not(:disabled) {
    background-color: #1e3838;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(43, 79, 79, 0.2);
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .input-hint {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #95a5a6;
    text-align: center;
  }

  .input-hint .warning {
    color: #e74c3c;
    font-weight: 500;
  }

  .completion-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.5rem;
    background: #e8f5e8;
    border: 1px solid #c3e6cb;
    border-radius: 12px;
    color: #2b4f4f;
    font-weight: 500;
  }

  .new-chat-button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    background-color: #2b4f4f;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .new-chat-button:hover {
    background-color: #1e3838;
  }

  .chat-buttons {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 0;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .chat-button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 80px;
  }

  .chat-button.primary {
    background-color: #2b4f4f;
    color: white;
  }

  .chat-button.primary:hover {
    background-color: #1e3838;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(43, 79, 79, 0.3);
  }

  .chat-button.secondary {
    background-color: #f8f9fa;
    color: #2b4f4f;
    border: 2px solid #e6f7f7;
  }

  .chat-button.secondary:hover {
    background-color: #e6f7f7;
    border-color: #2b4f4f;
    transform: translateY(-2px);
  }

  /* Анимации */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }

  /* Мобильная адаптация */
  @media (max-width: 768px) {
    main {
      padding: 0.5rem;
    }

    .chat-container {
      height: 95vh;
      max-height: none;
      border-radius: 8px;
    }

    .chat-header {
      padding: 1rem;
    }

    .messages-container {
      padding: 1rem;
    }

    .message-content {
      max-width: 85%;
    }

    .input-container {
      padding: 1rem;
    }

    .back-button {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }

    .status-text {
      font-size: 0.8rem;
    }
  }

  /* Скроллбар */
  .messages-container::-webkit-scrollbar {
    width: 6px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  .messages-container::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style> 