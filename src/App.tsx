import { useState } from "react";
import PlansView from "./components/PlansView";
import FoodsView from "./components/FoodsView";
import ImportView from "./components/ImportView";
import FoodDetailView from "./components/FoodDetailView";
import { isTauri } from "./lib/tauri";
import { useI18n } from "./lib/i18n";
import ThemeToggle from "./components/ThemeToggle";

type View = "plans" | "foods" | "import";

export default function App() {
  const [view, setView] = useState<View>("plans");
  const [openFoodId, setOpenFoodId] = useState<number | null>(null);
  const inTauri = isTauri();
  const { t, locale, setLocale } = useI18n();

  const tabs: { k: View; label: string; icon: string }[] = [
    { k: "plans", label: t("nav.plans"), icon: "📅" },
    { k: "foods", label: t("nav.foods"), icon: "🥘" },
    { k: "import", label: t("nav.import"), icon: "📥" },
  ];

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-base-100/80 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-16 flex items-center gap-2 sm:gap-3 md:gap-6">
          <h1 className="text-base sm:text-lg md:text-xl font-bold whitespace-nowrap shrink-0">
            🍳 <span className="hidden sm:inline">Cook</span>
            <span className="text-primary">Plans</span>
          </h1>
          <nav className="flex gap-1 flex-1 min-w-0 overflow-x-auto">
            {tabs.map((tb) => (
              <button
                key={tb.k}
                onClick={() => {
                  setOpenFoodId(null);
                  setView(tb.k);
                }}
                disabled={!inTauri}
                className={`btn btn-sm btn-ghost whitespace-nowrap shrink-0 ${
                  view === tb.k && openFoodId === null ? "btn-active bg-base-200" : ""
                }`}
              >
                <span className="hidden sm:inline">{tb.icon}</span>
                {tb.label}
              </button>
            ))}
          </nav>

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

          <span
            className="text-xs opacity-50 hidden md:inline shrink-0 tabular-nums"
            dir="ltr"
          >
            v0.1.0
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {!inTauri ? (
          <WebNotice />
        ) : openFoodId !== null ? (
          <FoodDetailView foodId={openFoodId} onBack={() => setOpenFoodId(null)} />
        ) : (
          <>
            {view === "plans" && <PlansView onOpenFood={setOpenFoodId} />}
            {view === "foods" && <FoodsView onOpenFood={setOpenFoodId} />}
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
