import Marker from "@editorjs/marker";

export const TOKEN_KEY = "admin_token";

export const EDITOR_TOOLS: string[] = [
  "paragraph", "list", "table", "divider", "quote", "code", "imageSingle", "imageGallery",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EDITOR_INLINE_TOOLS: Record<string, any> = { marker: { class: Marker } };

export type View = "all" | "note" | "work" | "images";

export type TagItem = { title: string; highlight: boolean };

export type NoteForm = {
  contentType: "note" | "work";
  slug: string;
  title: string;
  preview: string;
  tagItems: TagItem[];
  content: OutputData | null;
  link: string;
  linkText: string;
};

export type OutputData = {
  time?: number;
  blocks: { id?: string; type: string; data: Record<string, unknown> }[];
  version?: string;
};

export const EMPTY_FORM: NoteForm = {
  contentType: "note",
  slug: "",
  title: "",
  preview: "",
  tagItems: [],
  content: null,
  link: "",
  linkText: "",
};
