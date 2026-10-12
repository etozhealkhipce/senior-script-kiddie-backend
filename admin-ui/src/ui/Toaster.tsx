import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { dismissToast, subscribeToasts, type ToastItem } from "./toast";

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  return createPortal(
    <div className="ui-toaster" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`ui-toast ui-toast--${t.kind}`}>
          <span data-tag>{t.kind === "error" ? "error" : "done"}</span>
          <span className="ui-toast-body">
            <span className="ui-toast-title">{t.title}</span>
            {t.description && <span className="ui-toast-desc">{t.description}</span>}
          </span>
          <button
            type="button"
            className="ui-toast-close"
            aria-label="dismiss"
            onClick={() => dismissToast(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
