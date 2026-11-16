import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Food } from "../lib/types";
import FoodFormModal from "./FoodFormModal";

export default function FoodsView({ onOpenFood }: { onOpenFood: (id: number) => void }) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      setFoods(await api.listFoods());
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Foods</h1>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          + New Food
        </button>
      </div>

      {err && <div className="alert alert-error text-sm">{err}</div>}

      {foods.length === 0 ? (
        <div className="card bg-base-200 p-8 text-center opacity-70">
          No foods yet. Create your first food or import a bundle.
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
          {foods.map((f) => (
            <div key={f.id} className="mb-4 break-inside-avoid">
              <button
                onClick={() => onOpenFood(f.id)}
                className="card bg-base-200 border-2 border-base-300 hover:border-primary transition text-left w-full hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="card-body p-4">
                  <div className="flex items-start gap-2">
                    <div className="text-3xl">🥘</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-tight break-words">{f.name}</h3>
                      <div className="text-[11px] uppercase tracking-wider opacity-50 mt-0.5">
                        {f.slug}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="badge badge-sm badge-ghost">
                      ⏱ {f.minDuration}–{f.maxDuration}m
                    </span>
                  </div>
                  {f.description && (
                    <p className="text-sm opacity-70 mt-2 leading-snug">{f.description}</p>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <FoodFormModal
          food={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
