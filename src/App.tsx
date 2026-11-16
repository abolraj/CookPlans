import { useState } from "react";
import PlansView from "./components/PlansView";
import FoodsView from "./components/FoodsView";
import ImportView from "./components/ImportView";

type View = "plans" | "foods" | "import";

const TABS: { k: View; label: string; icon: string }[] = [
  { k: "plans", label: "Plans", icon: "📅" },
  { k: "foods", label: "Foods", icon: "🥘" },
  { k: "import", label: "Import", icon: "📥" },
];

export default function App() {
  const [view, setView] = useState<View>("plans");
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
                onClick={() => setView(t.k)}
                className={`btn btn-sm btn-ghost ${view === t.k ? "btn-active bg-base-200" : ""}`}
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
        {view === "plans" && <PlansView />}
        {view === "foods" && <FoodsView />}
        {view === "import" && <ImportView />}
      </main>
    </div>
  );
}
