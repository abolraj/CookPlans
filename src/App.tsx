import { useState, useEffect, useRef } from "react";
import PlansView from "./components/PlansView";
import FoodsView from "./components/FoodsView";
import ImportView from "./components/ImportView";
import FoodDetailView from "./components/FoodDetailView";
import { isTauri } from "./lib/tauri";
import { useI18n } from "./lib/i18n";
import ThemeToggle from "./components/ThemeToggle";
import NotificationPermissionModal from "./components/NotificationPermissionModal";
import { api } from "./lib/api";
import {
  cancelAllReminders,
  nextWeekdayOccurrence,
  scheduleStepReminder,
} from "./lib/notifications";

type View = "plans" | "foods" | "import";

export default function App() {
  const [view, setView] = useState<View>("plans");
  const [openFoodId, setOpenFoodId] = useState<number | null>(null);
  const [navKey, setNavKey] = useState(0);
  const inTauri = isTauri();
  const { t, locale, setLocale } = useI18n();

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

  const [showNotifModal, setShowNotifModal] = useState(false);

  useEffect(() => {
    if (!inTauri) return;
    // Let the UI paint first; avoid blocking the first render.
    const id = setTimeout(() => setShowNotifModal(true), 1500);
    return () => clearTimeout(id);
  }, [inTauri]);

  // Keep t() fresh inside the long-lived schedule effect.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });

  // Arm OS-level notifications for the active plan's future cooking steps.
  // Runs on mount, when the app returns from background, and whenever the
  // "cookplans:schedules-changed" event fires after meal/step/plan edits.
  useEffect(() => {
    if (!inTauri) return;
    let cancelled = false;

    async function reschedule() {
      if (cancelled) return;
      try {
        const plans = await api.listPlans();
        const active = plans.find((p) => p.isActive);
        await cancelAllReminders();
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
            await scheduleStepReminder({
              fireAt,
              key: `${meal.id}|${m.weekday}|${step.id}|${fireAt.getTime()}`,
              title: tRef.current("notificationContent.stepTitle", {
                stepName: step.name,
              }),
              body: tRef.current("notificationContent.stepBody", {
                foodName: food.name,
                duration: step.duration,
              }),
              largeBody:
                tRef.current("notificationContent.stepLargeBody", {
                  stepName: step.name,
                  foodName: food.name,
                  mealName: meal.name,
                  duration: step.duration,
                }) +
                (step.description ? `\n\n${step.description}` : ""),
            });
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
  }, [inTauri]);

  return (
    <div className="min-h-screen bg-base-100 flex flex-col p-1">
      <header className="sticky top-0 z-30 backdrop-blur bg-base-100/80 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:h-16 py-2 sm:py-0">
            {/* Brand */}
            <h1 className="text-base sm:text-lg md:text-xl font-bold whitespace-nowrap shrink-0">
              🍳 <span className="sm:inline">Cook</span>
              <span className="text-primary">Plans</span>
            </h1>

            {/* Right‑side controls — pushed to the end on mobile */}
            <div className="flex items-center gap-1 ms-auto sm:ms-0">
              <ThemeToggle />

              <div className="flex items-center gap-1 shrink-0" aria-label={t("common.language")}>
                <button
                  onClick={() => setLocale("en")}
                  className={`btn btn-xs ${locale === "en" ? "btn-primary" : "btn-ghost"}`}
                  title="English"
                >
                  EN
                </button>
                <button
                  onClick={() => setLocale("fa")}
                  className={`btn btn-xs ${locale === "fa" ? "btn-primary" : "btn-ghost"}`}
                  title="فارسی"
                >
                  فا
                </button>
              </div>

              <span className="text-xs opacity-50 hidden md:inline shrink-0 tabular-nums" dir="ltr">
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
                  className={`btn btn-sm btn-ghost whitespace-nowrap shrink-0 ${view === tb.k && openFoodId === null ? "btn-active bg-base-200" : ""
                    }`}
                >
                  <span>{tb.icon}</span>      {/* ← always show the icon */}
                  {tb.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {!inTauri ? (
          <WebNotice />
        ) : openFoodId !== null ? (
          <FoodDetailView foodId={openFoodId} onBack={() => setOpenFoodId(null)} />
        ) : (
          <>
            {showNotifModal && (
              <NotificationPermissionModal
                onClose={() => {
                  setShowNotifModal(false);
                  window.dispatchEvent(new Event("cookplans:schedules-changed"));
                }}
              />
            )}
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
          <pre className="bg-base-300 rounded-lg p-4 text-sm overflow-x-auto" dir="ltr">
            <code>npm run tauri dev</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
