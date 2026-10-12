export type ToastKind = "success" | "error";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

type Listener = (items: ToastItem[]) => void;

export const TOAST_DURATION_MS = 4000;
export const MAX_TOASTS = 3;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit(): void {
  for (const listener of listeners) listener(items);
}

function clearTimer(id: number): void {
  clearTimeout(timers.get(id));
  timers.delete(id);
}

export function dismissToast(id: number): void {
  clearTimer(id);
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(kind: ToastKind, title: string, description?: string): number {
  const id = nextId++;
  items = [...items, { id, kind, title, description }];
  for (const dropped of items.slice(0, Math.max(0, items.length - MAX_TOASTS))) {
    clearTimer(dropped.id);
  }
  items = items.slice(-MAX_TOASTS);
  timers.set(
    id,
    setTimeout(() => dismissToast(id), TOAST_DURATION_MS),
  );
  emit();
  return id;
}

export const toast = {
  success: (title: string, description?: string) => push("success", title, description),
  error: (title: string, description?: string) => push("error", title, description),
};

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

/** Drops every toast and timer (tests, sign-out). */
export function resetToasts(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  items = [];
  nextId = 1;
  emit();
}
