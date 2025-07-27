<script lang="ts">
  import { currentLanguage, type Language } from '$lib/i18n';

  function switchLanguage() {
    currentLanguage.update(lang => lang === 'ru' ? 'en' : 'ru');
  }
</script>

<button on:click={switchLanguage} class="language-switcher">
  {$currentLanguage === 'ru' ? 'EN' : 'RU'}
</button>

<style>
  .language-switcher {
    background-color: #f0f8ff;
    color: #007bff;
    border: none;
    border-radius: 20px;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .language-switcher:hover {
    background-color: #d0e8ff;
  }
</style> 