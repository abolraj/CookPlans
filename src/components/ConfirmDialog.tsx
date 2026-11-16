import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface ConfirmOpts {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOpts) => Promise<boolean>;

const Ctx = createContext<ConfirmFn | null>(null);

interface Pending {
  opts: ConfirmOpts;
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve });
    });
  }, []);

  const close = useCallback((v: boolean) => {
    setPending((p) => {
      p?.resolve(v);
      return null;
    });
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (pending) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [pending]);

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        className="modal"
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
      >
        {pending && (
          <div className="modal-box">
            {pending.opts.title && (
              <h3 className="text-lg font-bold mb-2 break-words">
                {pending.opts.title}
              </h3>
            )}
            <p className="py-2 break-words whitespace-pre-line">
              {pending.opts.message}
            </p>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => close(false)}
              >
                {pending.opts.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={`btn ${
                  pending.opts.danger ? "btn-error" : "btn-primary"
                }`}
                onClick={() => close(true)}
              >
                {pending.opts.confirmLabel ?? "OK"}
              </button>
            </div>
          </div>
        )}
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={() => close(false)}>
            close
          </button>
        </form>
      </dialog>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useConfirm must be used inside ConfirmProvider");
  }
  return ctx;
}
