import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../lib/i18n";
import { alarmScheduler, type PermissionsStatus } from "../lib/alarmScheduler";

export default function PermissionsModal({
  onClose,
  onAllGranted,
}: {
  onClose: () => void;
  onAllGranted?: () => void;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<PermissionsStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      const s = await alarmScheduler.checkPermissions();
      setStatus(s);
      if (s.notificationsGranted && s.exactAlarmGranted && s.fullScreenIntentGranted) {
        onAllGranted?.();
      }
    } catch (e) {
      console.error("[PermissionsModal] checkPermissions failed", e);
      setStatus({
        notificationsGranted: false,
        exactAlarmGranted: false,
        fullScreenIntentGranted: false,
      });
      // Do NOT call onAllGranted() — we don't actually know the state.
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Re-check when the user returns from the system Settings screen.
  useEffect(() => {
    const onBack = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
  }, []);

  async function grant(kind: "notif" | "exact" | "fsi") {
    setBusy(kind);
    setErr(null);
    try {
      if (kind === "notif") {
        await alarmScheduler.requestNotificationPermission();
      } else if (kind === "exact") {
        await invoke("plugin:alarm|open_exact_alarm_settings");
      } else {
        await invoke("plugin:alarm|open_full_screen_intent_settings");
      }
      setTimeout(refresh, 800);
    } catch (e) {
      console.error(`[PermissionsModal] grant(${kind}) failed`, e);
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-base-100 border-[3px] border-base-content shadow-[6px_6px_0_var(--color-base-content)] w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">🔔</span> {t("permissions.title")}
          </h2>
          <p className="text-sm opacity-80">{t("permissions.body")}</p>
          {err && (
            <div className="alert alert-error text-xs break-words" dir="ltr">
              {err}
            </div>
          )}
          <Row label={t("permissions.notifications")} ok={status?.notificationsGranted ?? false}
            busy={busy === "notif"} grantLabel={t("permissions.grant")}
            grantedLabel={t("permissions.granted")} onGrant={() => grant("notif")} />
          <Row label={t("permissions.exactAlarm")} ok={status?.exactAlarmGranted ?? false}
            busy={busy === "exact"} grantLabel={t("permissions.openSettings")}
            grantedLabel={t("permissions.granted")} onGrant={() => grant("exact")} />
          <Row label={t("permissions.fullScreenIntent")} ok={status?.fullScreenIntentGranted ?? false}
            busy={busy === "fsi"} grantLabel={t("permissions.openSettings")}
            grantedLabel={t("permissions.granted")} onGrant={() => grant("fsi")} />

          <div className="flex justify-end">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("common.close")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label, ok, busy, grantLabel, grantedLabel, onGrant,
}: { label: string; ok: boolean; busy: boolean; grantLabel: string; grantedLabel: string; onGrant: () => void; }) {
  return (
    <div className={`flex items-center gap-3 p-3 border-2 ${ok ? "border-success bg-success/10" : "border-base-300"}`}>
      <div className="flex-1 text-sm font-medium">{label}</div>
      {ok ? (
        <span className="badge badge-success badge-sm">✓ {grantedLabel}</span>
      ) : (
        <button className="btn btn-xs btn-primary" onClick={onGrant} disabled={busy}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : grantLabel}
        </button>
      )}
    </div>
  );
}