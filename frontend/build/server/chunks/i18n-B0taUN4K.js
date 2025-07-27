import { z as derived, x as writable } from './index2-58vKXrUN.js';

const currentLanguage = writable("ru");
const translationData = {
  ru: {
    name: "Андрей Черцов",
    title: "Разработчик / Системный аналитик",
    tagline: "Автоматизирую бизнес-процессы и создаю эффективные веб-решения с интеграцией AI",
    sections: {
      stack: "Инструменты",
      services: "Решаю задачи"
    },
    stack: [
      "API",
      "AI",
      "GPT",
      "n8n",
      "Zapier",
      "Bitrix24",
      "Jira",
      "Noition",
      "CRM",
      "ERP",
      "Node/JS/TS"
    ],
    services: [
      "Автоматизация рутинных процессов",
      "Интеграция AI в рабочие процессы",
      "Быстрая разработка корпоративных решений",
      "Оптимизация UX/UI бизнес-приложений"
    ],
    cta: "Обсудить проект",
    contacts: {
      email: "andrey.ch02@gmail.com",
      social: {
        instagram: "8uyo5n",
        telegram: "sduhadj",
        github: "andrew-chertsov"
      }
    }
  },
  en: {
    name: "Andrew Chertsov",
    title: "Developer / Systems Analyst",
    tagline: "I automate business processes and create effective web solutions with AI integration",
    sections: {
      stack: "Tools",
      services: "I solve"
    },
    stack: [
      "API",
      "AI",
      "GPT",
      "n8n",
      "Zapier",
      "Bitrix24",
      "Agile CRM",
      "Jira",
      "Noition",
      "CRM",
      "ERP",
      "Node/JS/TS"
    ],
    services: [
      "Routine process automation",
      "AI integration into workflows",
      "Rapid corporate solution development",
      "Business application UX/UI optimization"
    ],
    cta: "Discuss project",
    contacts: {
      email: "andrey.ch02@gmail.com",
      social: {
        instagram: "8uyo5n",
        telegram: "sduhadj",
        github: "andrew-chertsov"
      }
    }
  }
};
derived(
  currentLanguage,
  ($currentLanguage) => translationData[$currentLanguage]
);
//# sourceMappingURL=i18n-B0taUN4K.js.map
