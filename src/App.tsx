import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import PlansView from "./components/PlansView";
import FoodsView from "./components/FoodsView";
import ImportView from "./components/ImportView";
import FoodDetailView from "./components/FoodDetailView";
import { isTauri } from "./lib/tauri";
import { useI18n } from "./lib/i18n";
import ThemeToggle from "./components/ThemeToggle";
import PermissionsModal from "./components/PermissionsModal";
import { api } from "./lib/api";
import {
  cancelAllReminders,
  nextWeekdayOccurrence,
  scheduleStepReminder,
} from "./lib/notifications";
import { alarmScheduler, hashId } from "./lib/alarmScheduler";

type View = "plans" | "foods" | "import";

export default function App() {
  const [view, setView] = useState<View>("plans");
  const [openFoodId, setOpenFoodId] = useState<number | null>(null);
  const [navKey, setNavKey] = useState(0);

  const inTauri = isTauri();
  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  // The alarm-scheduler plugin only registers on Android; gate the UI there.
  const showAlarmUI = inTauri && isAndroid;

  const { t, locale, setLocale } = useI18n();

  // ─── Alarm toggle (Android only; default-on for desktop/web Tauri) ───
  const [alarmsEnabled, setAlarmsEnabled] = useState<boolean>(() => {
    if (!isAndroid) return true;
    try {
      return localStorage.getItem("cookplans.alarmsEnabled") === "1";
    } catch {
      return false;
    }
  });
  const [showPermissions, setShowPermissions] = useState(false);
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    if (!isAndroid) return;
    try {
      localStorage.setItem(
        "cookplans.alarmsEnabled",
        alarmsEnabled ? "1" : "0"
      );
    } catch { }
  }, [alarmsEnabled, isAndroid]);

  // On launch, if user had enabled alarms, re-verify permissions.
  useEffect(() => {
    if (!showAlarmUI || !alarmsEnabled) return;
    (async () => {
      try {
        const s = await alarmScheduler.checkPermissions();
        const all =
          s.notificationsGranted &&
          s.exactAlarmGranted &&
          s.fullScreenIntentGranted;
        if (!all) setAlarmsEnabled(false);
      } catch {
        /* plugin not installed — ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAlarmUI]);

  // Poll ringing state so we can surface an in-app dismiss banner.
  useEffect(() => {
    if (!showAlarmUI) return;
    let cancelled = false;
    const check = async () => {
      try {
        const s = await invoke<{ ringing: boolean }>(
          "plugin:alarm|is_alarm_ringing"
        );
        if (!cancelled) setRinging(s.ringing);
      } catch { }
    };
    check();
    const id = setInterval(check, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [showAlarmUI]);

  const goToView = (v: View) => {
    setOpenFoodId(null);
    setView(v);
    setNavKey((k) => k + 1);
  };

  const tabs: { k: View; label: string; icon: string }[] = [
    { k: "plans", label: t("nav.plans"), icon: "📅" },
    { k: "foods", label: t("nav.foods"), icon: "🥘" },
    { k: "import", label: t("nav.import"), icon: "📥" },
  ];

  // Keep t() fresh inside the long-lived schedule effect.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });

  // Arm OS-level alarms (Android) / notifications (other Tauri) for the
  // active plan's future cooking steps. Runs on mount, on return from
  // background, and whenever "cookplans:schedules-changed" fires.
  useEffect(() => {
    if (!inTauri) return;
    if (isAndroid && !alarmsEnabled) return;
    let cancelled = false;

    async function reschedule() {
      if (cancelled) return;
      try {
        const plans = await api.listPlans();
        const active = plans.find((p) => p.isActive);

        // Cancel whatever is armed — rebuild from scratch.
        if (isAndroid) await alarmScheduler.cancelAll();
        else await cancelAllReminders();

        if (!active) return;

        const details = await api.getPlanWeekDetails(active.id);
        const now = new Date();

        for (const m of details) {
          const { meal, food, cookStartAt, steps } = m.details;
          for (const step of steps) {
            const fireAt = nextWeekdayOccurrence(
              m.weekday,
              cookStartAt + step.offsetTime
            );
            if (fireAt <= now) continue;

            const key = `${meal.id}|${m.weekday}|${step.id}|${fireAt.getTime()}`;
            const title = tRef.current("notificationContent.stepTitle", {
              stepName: step.name,
            });
            const body = tRef.current("notificationContent.stepBody", {
              foodName: food.name,
              duration: step.duration,
            });
            const largeBody =
              tRef.current("notificationContent.stepLargeBody", {
                stepName: step.name,
                foodName: food.name,
                mealName: meal.name,
                duration: step.duration,
              }) + (step.description ? `\n\n${step.description}` : "");

            if (isAndroid) {
              // Full-screen native alarm: AlarmService (from tauri-plugin-alarm)
              // is started by AlarmManager via PendingIntent.getForegroundService.
              await alarmScheduler.schedule({
                id: hashId(key),
                triggerAtMillis: fireAt.getTime(),
                title,
                body,
                stepName: step.name,
                foodName: food.name,
                dismissLabel: tRef.current("common.dismiss"),
              });
            } else {
              // Desktop / other Tauri: keep using the notification plugin.
              await scheduleStepReminder({ fireAt, key, title, body, largeBody });
            }
          }
        }
      } catch (e) {
        console.warn("[App] reschedule notifications failed", e);
      }
    }

    reschedule();
    const onVis = () => {
      if (!document.hidden) reschedule();
    };
    const onBump = () => reschedule();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("cookplans:schedules-changed", onBump);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("cookplans:schedules-changed", onBump);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTauri, isAndroid, alarmsEnabled]);

  async function toggleAlarms(next: boolean) {
    if (next) {
      // Gate on permissions: show the modal, only enable after all granted.
      setShowPermissions(true);
      return;
    }
    // Turning OFF: cancel everything armed and silence any active alarm.
    setAlarmsEnabled(false);
    setRinging(false);
    try {
      if (isAndroid) {
        await alarmScheduler.cancelAll();
        await invoke("plugin:alarm|dismiss");
      } else {
        await cancelAllReminders();
      }
    } catch { }
  }

  return (
    <div className="relative min-h-screen bg-base-100 flex flex-col p-1 py-0">
      {/* ─── Ringing banner: shows while the native alarm is sounding ─── */}
      {ringing && (
        <div className="bg-error text-error-content px-3 py-2 flex items-center gap-2 text-sm border-b-[3px] border-base-content">
          <span className="text-lg">🚨</span>
          <span className="flex-1 font-medium">{t("alarms.ringing")}</span>
          <button
            className="btn btn-xs"
            onClick={async () => {
              try {
                await invoke("plugin:alarm|dismiss");
              } catch { }
              setRinging(false);
            }}
          >
            {t("common.dismiss")}
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 backdrop-blur bg-base-100/80 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:h-16 py-2 sm:py-0">
            {/* Brand */}
            <h1 className="text-base sm:text-lg md:text-xl font-bold whitespace-nowrap shrink-0">
              🍳 <span className="sm:inline">Cook</span>
              <span className="text-primary">Plans</span>
            </h1>

            {/* Right-side controls — pushed to the end on mobile */}
            <div className="flex items-center gap-1 ms-auto sm:ms-0">
              <ThemeToggle />

              <div
                className="flex items-center gap-1 shrink-0"
                aria-label={t("common.language")}
              >
                <button
                  onClick={() => setLocale("en")}
                  className={`btn btn-xs ${locale === "en" ? "btn-primary" : "btn-ghost"
                    }`}
                  title="English"
                >
                  EN
                </button>
                <button
                  onClick={() => setLocale("fa")}
                  className={`btn btn-xs ${locale === "fa" ? "btn-primary" : "btn-ghost"
                    }`}
                  title="فارسی"
                >
                  فا
                </button>
              </div>

              <span
                className="text-xs opacity-50 hidden md:inline shrink-0 tabular-nums"
                dir="ltr"
              >
                v0.1.0
              </span>
            </div>

            {/* Nav — full row on mobile, inline on ≥sm */}
            <nav className="order-last w-full sm:order-none sm:w-auto sm:flex-1 flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {tabs.map((tb) => (
                <button
                  key={tb.k}
                  onClick={() => goToView(tb.k)}
                  disabled={!inTauri}
                  className={`btn btn-sm btn-ghost whitespace-nowrap shrink-0 ${view === tb.k && openFoodId === null
                    ? "btn-active bg-base-200"
                    : ""
                    }`}
                >
                  <span>{tb.icon}</span>
                  {tb.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main
        className={`flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-13 ${showAlarmUI ? "pb-24" : ""
          }`}
      >
        {!inTauri ? (
          <WebNotice />
        ) : openFoodId !== null ? (
          <FoodDetailView
            foodId={openFoodId}
            onBack={() => setOpenFoodId(null)}
          />
        ) : (
          <>
            {view === "plans" && (
              <PlansView key={`plans-${navKey}`} onOpenFood={setOpenFoodId} />
            )}
            {view === "foods" && (
              <FoodsView key={`foods-${navKey}`} onOpenFood={setOpenFoodId} />
            )}
            {view === "import" && <ImportView />}
          </>
        )}
      </main>

      {/* ─── Footer toggle: Android only (alarm-scheduler plugin) ─── */}
      {showAlarmUI && (
        <footer className="fixed bottom-[var(--safe-area-inset-bottom,0px)] inset-x-0 z-30 backdrop-blur bg-base-100/90 border-t-[3px] h-13 box-border border-base-content">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-lg">🔔</span>
              <span className="text-sm font-medium">{t("alarms.toggle")}</span>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={alarmsEnabled}
                onChange={(e) => toggleAlarms(e.target.checked)}
              />
            </label>
            <span
              className={`text-xs tabular-nums ${alarmsEnabled ? "text-success" : "opacity-50"
                }`}
              dir="ltr"
            >
              {alarmsEnabled ? t("alarms.on") : t("alarms.off")}
            </span>
          </div>
        </footer>
      )}

      {/* ─── Permissions gate: shown only when enabling alarms ─── */}
      {showPermissions && (
        <PermissionsModal
          onAllGranted={() => {
            setAlarmsEnabled(true);
            window.dispatchEvent(new Event("cookplans:schedules-changed"));
          }}
          onClose={async () => {
            setShowPermissions(false);
            try {
              const s = await alarmScheduler.checkPermissions();
              if (
                s.notificationsGranted &&
                s.exactAlarmGranted &&
                s.fullScreenIntentGranted
              ) {
                setAlarmsEnabled(true);
                window.dispatchEvent(new Event("cookplans:schedules-changed"));
              }
            } catch (e) {
              console.error("[App] post-modal permission check failed", e);
            }
          }}
        />
      )}
    </div>
  );
}

function WebNotice() {
  const { t } = useI18n();
  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="card bg-base-200 border border-base-300 shadow-xl">
        <div className="card-body p-8 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🌐</span>
            <h2 className="card-title text-2xl">{t("web.title")}</h2>
          </div>
          <p className="opacity-80">{t("web.body")}</p>
          <div className="alert alert-info text-sm">{t("web.stopAndRun")}</div>
          <pre
            className="bg-base-300 rounded-lg p-4 text-sm overflow-x-auto"
            dir="ltr"
          >
            <code>npm run tauri dev</code>
          </pre>
        </div>
      </div>
    </div>
  );
}