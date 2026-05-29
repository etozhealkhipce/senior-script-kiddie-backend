export interface EditorBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface EditorData {
  time?: number;
  blocks: EditorBlock[];
  version?: string;
  meta?: Record<string, unknown>;
}

export interface SubtitleItem {
  title: string;
  highlight: boolean;
}
