import { writable, derived } from 'svelte/store';

// Ключ в localStorage
const STORAGE_KEY = 'lang';

// Определяем стартовый язык из localStorage, если доступен
let initialLang: Language = 'ru';

if (typeof window !== 'undefined') {
  const saved = window.localStorage.getItem(STORAGE_KEY) as Language | null;
  if (saved === 'en' || saved === 'ru') {
    initialLang = saved;
  }
}

// Доступные языки
export type Language = 'ru' | 'en';

// Хранилище для текущего языка
export const currentLanguage = writable<Language>(initialLang);

// Подписываемся на изменения и сохраняем в localStorage
currentLanguage.subscribe((lang) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }
});

// Типы данных для текстов
export interface TranslationData {
  name: string;
  title: string;
  tagline: string;
  sections: {
    stack: string;
    services: string;
  };
  stack: string[];
  services: string[];
  cta: string;
  contacts: {
    email: string;
    social: {
      instagram: string;
      telegram: string;
      github: string;
    };
  };
}

// Данные переводов
const translationData: Record<Language, TranslationData> = {
  ru: {
    name: 'Name',
    title: 'Веб-разработчик / Системный аналитик',
    tagline: 'Автоматизирую бизнес-процессы и создаю эффективные веб-решения с AI',
    sections: {
      stack: 'Инструменты',
      services: 'Решаю задачи',
    },
    stack: [
      'API', 'AI', 'GPT','n8n', 'Zapier', 'Bitrix24', 'Jira', 'Notion', 'CRM', 'ERP', 'Node/JS/TS'
    ],
    services: [
      'Автоматизация рутинных процессов',
      'Интеграция AI в рабочие процессы',
      'Оптимизация UX/UI бизнес-приложений',
      'Подбор программного обеспечения для бизнеса'
    ],
    cta: 'Обсудить проект',
    contacts: {
      email: 'example@gmail.com',
      social: {
        instagram: 'example',
        telegram: 'example',
        github: 'example'
      }
    }
  },
  en: {
    name: 'Name',
    title: 'Web developer / Systems Analyst',
    tagline: 'Automate business processes and create effective web solutions with AI',
    sections: {
      stack: 'Tools',
      services: 'I solve',
    },
    stack: [
      'API', 'AI', 'GPT', 'n8n', 'Zapier', 'Agile CRM', 'Jira', 'Notion', 'CRM', 'ERP', 'Node/JS/TS'
    ],
    services: [
      'Routine process automation',
      'AI integration into workflows',
      'Business application UX/UI optimization',
      'Software selection for business needs'
    ],
    cta: 'Discuss project',
    contacts: {
      email: 'example@gmail.com',
      social: {
        instagram: 'example',
        telegram: 'example',
        github: 'example'
      }
    }
  }
};

// Хранилище текущего перевода
export const translations = derived(
  currentLanguage,
  ($currentLanguage) => translationData[$currentLanguage]
); 