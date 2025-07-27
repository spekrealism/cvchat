<script lang="ts">
  import Field from '$lib/components/Field.svelte';  
  import LanguageSwitcher from '$lib/components/Langswich.svelte';
  import { translations } from '$lib/i18n';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  
  let showPage = false;
  let touchStartX = 0;
  let touchEndX = 0;
  let sidebarEl: HTMLDivElement;
  let heroEl: HTMLDivElement;
  let rows = 20;
  let cols = 10;
  
  function updateFieldSize() {
    if (sidebarEl) {
      // Размер одной ячейки (px) + margin
      const cellSize = 30;
      const cellMargin = 5;
      const cellFullSize = cellSize + cellMargin;
      const sidebarRect = sidebarEl.getBoundingClientRect();
      rows = Math.max(5, Math.floor(sidebarRect.height / cellFullSize));
      cols = Math.max(5, Math.floor(sidebarRect.width / cellFullSize));
    }
  }
  
  onMount(() => {
    showPage = true;
    setTimeout(updateFieldSize, 0);
    window.addEventListener('resize', updateFieldSize);
    
    // Добавляем обработчики для свайпов
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      handleSwipe();
    };
    
    const handleSwipe = () => {
      const threshold = 100; // Минимальное расстояние свайпа
      
      if (touchStartX - touchEndX > threshold) {
        // Свайп влево - переход в чат
        goToChat();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchend', handleTouchEnd, false);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, false);
      document.removeEventListener('touchend', handleTouchEnd, false);
      window.removeEventListener('resize', updateFieldSize);
    };
  });
  
  function goToChat() {
    showPage = false;
    setTimeout(() => {
      window.location.href = '/chat';
    }, 500);
  }
</script>

{#if showPage}
<main in:fly={{ x: 1000, duration: 500 }} out:fly={{ x: -1000, duration: 500 }}>
  <div class="page-layout">
    <div class="sidebar" bind:this={sidebarEl}>
      <Field sidebarWidth="100%" rows={rows} cols={cols}/>
    </div>
    
    <div class="hero" bind:this={heroEl}>
      <div class="container">
        <header>
          <div class="name-container">
            <h1>{$translations.name}</h1>
            <h2>{$translations.title}</h2>
          </div>
          <LanguageSwitcher />
        </header>
        
        <div class="tagline">{$translations.tagline}</div>
        
        <div class="content-wrapper">
          <div class="services-section">
            <h3>{$translations.sections.services}</h3>
            <div class="services-grid">
              {#each $translations.services as service}
                <div class="service-card">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <div>{service}</div>
                </div>
              {/each}
            </div>
          </div>
          
          <div class="stack-section">
            <h3>{$translations.sections.stack}</h3>
            <div class="stack-grid">
              {#each $translations.stack as tech}
                <div class="tech-badge">{tech}</div>
              {/each}
            </div>
          </div>
        </div>
        
        <div class="cta-container">
          <a href="/chat" class="cta-button" on:click|preventDefault={goToChat}>
            {$translations.cta}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
        
        <footer>
          <div class="social-icons">
            <a href="https://instagram.com/{$translations.contacts.social.instagram}" target="_blank" rel="noopener" class="social-icon" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <!-- <a href="https://github.com/{$translations.contacts.social.github}" target="_blank" rel="noopener" class="social-icon" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a> -->
          </div>
        </footer>
        
        <div class="swipe-hint">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <!-- <span>свайп для чата</span> -->
        </div>
      </div>
    </div>
  </div>
</main>
{/if}

<style>
  main {
    width: 100%;
    min-height: 100vh;
    font-family: 'Montserrat', 'Arial', sans-serif;
    color: #333;
    background-color: #fafafa;
  }
  
  .page-layout {
    display: flex;
    width: 100%;
    min-height: 100vh;
  }
  
  .sidebar {
    width: 20%;
    min-width: 240px;
    display: flex;
    flex-direction: column;
  }
  
  :global(.sidebar > *) {
    flex-grow: 1;
  }
  
  .hero {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  
  .container {
    width: 100%;
    max-width: 1000px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .name-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  h1 {
    font-size: 2rem;
    margin: 0;
    color: #2b4f4f;
    font-weight: 700;
  }
  
  h2 {
    font-size: 1rem;
    margin: 0;
    color: #666;
    font-weight: 500;
  }
  
  h3 {
    font-size: 1.2rem;
    margin: 0 0 1rem 0;
    color: #2b4f4f;
    font-weight: 600;
  }
  
  .tagline {
    font-size: 1.5rem;
    font-weight: 500;
    color: #444;
    line-height: 1.4;
    margin-bottom: 1rem;
  }
  
  .content-wrapper {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  @media (min-width: 768px) {
    .content-wrapper {
      grid-template-columns: 3fr 2fr;
    }
  }
  
  .services-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .service-card {
    background-color: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .service-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .service-card svg {
    color: #2b4f4f;
    min-width: 20px;
  }
  
  .stack-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .tech-badge {
    background-color: #e6f7f7;
    color: #2b4f4f;
    border-radius: 20px;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .cta-container {
    display: flex;
    justify-content: center;
    margin: 1rem 0;
  }
  
  .cta-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #2b4f4f;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 30px;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    transition: background-color 0.2s, transform 0.2s;
    box-shadow: 0 4px 12px rgba(43, 79, 79, 0.2);
  }
  
  .cta-button:hover {
    background-color: #1e3838;
    transform: translateY(-2px);
  }
  
  footer {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }
  
  .social-icons {
    display: flex;
    gap: 1rem;
  }
  
  .social-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #f0f0f0;
    transition: all 0.3s ease;
  }
  
  .social-icon svg {
    fill: #2b4f4f;
    width: 18px;
    height: 18px;
    transition: fill 0.3s ease;
  }
  
  .social-icon:hover {
    background-color: #2b4f4f;
  }
  
  .social-icon:hover svg {
    fill: white;
  }
  
  .swipe-hint {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: rgba(43, 79, 79, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    color: #555;
    font-size: 0.85rem;
    animation: pulse 2s infinite;
  }
  
  .swipe-hint svg {
    width: 16px;
    height: 16px;
  }
  
  @keyframes pulse {
    0% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.5;
    }
  }
  
  @media (max-width: 768px) {
    .page-layout {
      flex-direction: column;
    }
    
    .sidebar {
      width: 100%;
      height: 80vh; /* Ограничиваем высоту блока с "матрицей" */
      overflow-y: auto; /* Добавляем прокрутку, если контент не помещается */
    }
    
    .hero {
      padding: 0;
      flex: 1; /* Занимает оставшееся пространство */
      display: flex;
      flex-direction: column;
      overflow-y: auto; /* Добавляем прокрутку для основного контента */
    }
    
    .container {
      padding: 1rem;
    }
  }
</style>
