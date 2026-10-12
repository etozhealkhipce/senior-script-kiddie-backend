import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const pending = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    pending.current?.(ok);
    pending.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback<ConfirmFn>((next) => {
    pending.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={options !== null} title={options?.title ?? ""} onClose={() => settle(false)}>
        {options?.body && <p className="text-sm text-secondary">{options.body}</p>}
        <div className="ui-modal-actions">
          <Button variant="secondary" onClick={() => settle(false)}>
            {options?.cancelLabel ?? "cancel"}
          </Button>
          <Button variant={options?.danger ? "danger" : "primary"} onClick={() => settle(true)}>
            {options?.confirmLabel ?? "ok"}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
