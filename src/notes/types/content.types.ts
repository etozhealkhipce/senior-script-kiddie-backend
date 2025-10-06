export interface TextElement {
  type: 'text';
  content: string;
}

export interface LinkElement {
  type: 'link';
  url: string;
  external: boolean;
}

export type ContentElement = TextElement | LinkElement;

export interface ContentParagraph {
  id: string;
  elements: ContentElement[];
}

export interface NoteContent {
  paragraphs: ContentParagraph[];
}
