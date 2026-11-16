import { useState } from "react";
import PlansView from "./components/PlansView";
import FoodsView from "./components/FoodsView";
import ImportView from "./components/ImportView";
import FoodDetailView from "./components/FoodDetailView";
import { isTauri } from "./lib/tauri";

type View = "plans" | "foods" | "import";

const TABS: { k: View; label: string; icon: string }[] = [
  { k: "plans", label: "Plans", icon: "📅" },
  { k: "foods", label: "Foods", icon: "🥘" },
  { k: "import", label: "Import", icon: "📥" },
];

export default function App() {
  const [view, setView] = useState<View>("plans");
  const [openFoodId, setOpenFoodId] = useState<number | null>(null);
  const inTauri = isTauri();

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-base-100/80 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4 md:gap-6">
          <h1 className="text-lg md:text-xl font-bold whitespace-nowrap">
            🍳 Cook<span className="text-primary">Plans</span>
          </h1>
          <nav className="flex gap-1 flex-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.k}
                onClick={() => { setOpenFoodId(null); setView(t.k); }}
                disabled={!inTauri}
                className={`btn btn-sm btn-ghost ${view === t.k && openFoodId === null ? "btn-active bg-base-200" : ""}`}
              >
                <span className="hidden sm:inline">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
          <span className="text-xs opacity-50 hidden md:inline">v0.1.0</span>
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
  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="card bg-base-200 border border-base-300 shadow-xl">
        <div className="card-body p-8 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🌐</span>
            <h2 className="card-title text-2xl">Browser preview mode</h2>
          </div>
          <p className="opacity-80">
            You opened the Vite dev server directly. The <b>real app</b> runs inside
            the Tauri WebView, where the Rust backend, SQLite and native notifications
            are available.
          </p>
          <div className="alert alert-info text-sm">Stop this dev server and run:</div>
          <pre className="bg-base-300 rounded-lg p-4 text-sm overflow-x-auto">
            <code>npm run tauri dev</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
