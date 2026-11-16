import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Food } from "../lib/types";
import FoodFormModal from "./FoodFormModal";
import { useI18n } from "../lib/i18n";

export default function FoodsView({ onOpenFood }: { onOpenFood: (id: number) => void }) {
  const { t } = useI18n();
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
        <h1 className="text-2xl font-bold">{t("foods.title")}</h1>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          {t("foods.newFood")}
        </button>
      </div>

      {err && <div className="alert alert-error text-sm">{err}</div>}

      {foods.length === 0 ? (
        <div className="card bg-base-200 p-8 text-center opacity-70">{t("foods.empty")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {foods.map((f) => (
            <button
              key={f.id}
              onClick={() => onOpenFood(f.id)}
              className="card bg-base-200 border-2 border-base-300 hover:border-primary transition text-start w-full hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="card-body p-4 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="text-3xl shrink-0">🥘</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base leading-tight break-words">
                      {f.name}
                    </h3>
                    <div className="text-[11px] uppercase tracking-wider opacity-50 mt-0.5 break-all">
                      {f.slug}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="badge badge-sm badge-ghost">
                    ⏱ <bdi dir="ltr" className="tabular-nums">{f.minDuration}–{f.maxDuration}</bdi>{" "}
                    {t("units.min")}
                  </span>
                </div>
                {f.description && (
                  <p className="text-sm opacity-70 mt-2 leading-snug break-words">
                    {f.description}
                  </p>
                )}
              </div>
            </button>
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
