import { NoteContent } from '../types/content.types';

// Пример контента для заметки
export const exampleNoteContent: NoteContent = {
  paragraphs: [
    {
      id: 'intro',
      elements: [
        {
          type: 'text',
          content:
            'Effector — мощный инструмент для управления состоянием приложений позволяющий отделить бизнес логику от рендера',
        },
      ],
    },
    {
      id: 'link1',
      elements: [
        {
          type: 'link',
          url: 'https://effector.dev/',
          external: true,
        },
        {
          type: 'text',
          content: ' — официальная дока (там актуальные линки на нейродоки)',
        },
      ],
    },
    {
      id: 'link2',
      elements: [
        {
          type: 'link',
          url: 'https://patronum.effector.dev/',
          external: true,
        },
        {
          type: 'text',
          content: ' — хелперы для упрощения жизни',
        },
      ],
    },
    {
      id: 'link3',
      elements: [
        {
          type: 'link',
          url: 'https://withease.effector.dev/',
          external: true,
        },
        {
          type: 'text',
          content: ' — набор классных библиотек',
        },
      ],
    },
    {
      id: 'link4',
      elements: [
        {
          type: 'link',
          url: 'https://github.com/russia-consulate/webapp/tree/main',
          external: true,
        },
        {
          type: 'text',
          content: ' — проект с хорошим конфигом',
        },
      ],
    },
    {
      id: 'link5',
      elements: [
        {
          type: 'link',
          url: 'https://github.com/etozhealkhipce/spa-front-starter',
          external: true,
        },
        {
          type: 'text',
          content: ' — мой стартер проект для гитхаба (на основе проекта выше)',
        },
      ],
    },
    {
      id: 'link6',
      elements: [
        {
          type: 'link',
          url: 'https://github.com/Kelin2025/effector-factorio',
          external: true,
        },
        {
          type: 'text',
          content: ' — крутой проект для переиспользования model + ui',
        },
      ],
    },
    {
      id: 'link7',
      elements: [
        {
          type: 'link',
          url: 'https://github.com/yumauri/effector-storage',
          external: true,
        },
        {
          type: 'text',
          content: ' — синхронизация сторов с внешними хранилищами (ls, query)',
        },
      ],
    },
    {
      id: 'link8',
      elements: [
        {
          type: 'link',
          url: 'https://atomic-router.github.io/',
          external: true,
        },
        {
          type: 'text',
          content: ' — роутер с поддержкой effector',
        },
      ],
    },
    {
      id: 'link9',
      elements: [
        {
          type: 'link',
          url: 'https://github.com/AlexeyDuybo/effector-action',
          external: true,
        },
        {
          type: 'text',
          content: ' — управление событиями в императивном стиле',
        },
      ],
    },
    {
      id: 'link10',
      elements: [
        {
          type: 'link',
          url: 'https://eslint.effector.dev/',
          external: true,
        },
        {
          type: 'text',
          content: ' — eslint плагины',
        },
      ],
    },
    {
      id: 'link11',
      elements: [
        {
          type: 'link',
          url: 'https://github.com/effector/next',
          external: true,
        },
        {
          type: 'text',
          content: ' — адаптер для next.js',
        },
      ],
    },
  ],
};
