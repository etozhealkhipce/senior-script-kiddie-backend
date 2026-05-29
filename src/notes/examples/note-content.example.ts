import type { EditorData } from '../types/content.types';

// Example EditorJS content for a note (block-forge-editor output format)
export const exampleNoteContent: EditorData = {
  time: 1748000000000,
  version: '2.30.7',
  blocks: [
    {
      id: 'intro',
      type: 'paragraph',
      data: {
        text: 'Effector — мощный инструмент для управления состоянием приложений позволяющий отделить бизнес логику от рендера',
      },
    },
    {
      id: 'link1',
      type: 'paragraph',
      data: {
        text: '<a href="https://effector.dev/" target="_blank">effector.dev</a> — официальная дока (там актуальные линки на нейродоки)',
      },
    },
  ],
};
