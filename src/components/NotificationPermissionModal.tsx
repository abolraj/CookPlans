import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

type PermState = "granted" | "denied" | "prompt";

export default function NotificationPermissionModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<PermState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (await isPermissionGranted()) {
          onClose();
          return;
        }
        // If not granted, we are in a state where we can prompt.
        setState("prompt");
      } catch {
        // Plugin missing or not in Tauri — silently skip.
        onClose();
      }
    })();
  }, [onClose]);

  if (state === null) return null;

  const isDenied = state === "denied";

  async function ask() {
    setBusy(true);
    try {
      const result = await requestPermission();
      if (result === "granted") {
        onClose();
      } else {
        setState("denied");
      }
    } catch {
      setState("denied");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 border-[3px] border-base-content shadow-[6px_6px_0_var(--color-base-content)] w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">🔔</span>
            {t("notifications.title")}
          </h2>

          <p className="text-sm opacity-80 whitespace-pre-line">
            {isDenied
              ? t("notifications.deniedBody")
              : t("notifications.body")}
          </p>

          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              {t("common.cancel")}
            </button>
            {!isDenied && (
              <button
                className="btn btn-primary btn-sm"
                onClick={ask}
                disabled={busy}
              >
                {busy ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  t("notifications.enable")
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}