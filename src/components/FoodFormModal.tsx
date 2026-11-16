import { useState } from "react";
import { api } from "../lib/api";
import type { Food } from "../lib/types";
import { useI18n } from "../lib/i18n";

function slugify(s: string) {
  return (
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "food"
  );
}

export default function FoodFormModal({
  food,
  onClose,
  onSaved,
}: {
  food: Food | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(food?.name ?? "");
  const [desc, setDesc] = useState(food?.description ?? "");
  const [minDur, setMinDur] = useState(food?.minDuration ?? 10);
  const [maxDur, setMaxDur] = useState(food?.maxDuration ?? 20);
  const [err, setErr] = useState<string | null>(null);

  const isNew = !food;

  async function save() {
    if (!name.trim()) {
      setErr(t("common.nameRequired"));
      return;
    }
    try {
      if (isNew) {
        await api.createFood({
          name: name.trim(),
          slug: slugify(name),
          description: desc.trim() || undefined,
          minDuration: Number(minDur) || 0,
          maxDuration: Number(maxDur) || 0,
        });
      } else {
        await api.updateFood({
          id: food!.id,
          name: name.trim(),
          slug: food!.slug,
          description: desc.trim() || undefined,
          minDuration: Number(minDur) || 0,
          maxDuration: Number(maxDur) || 0,
        });
      }
      onSaved();
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">🥘</span>
            {isNew ? t("foods.newFoodTitle") : t("foods.editFoodTitle")}
          </h2>
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t("common.name")}</span>
            </label>
            <input
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t("common.description")}</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("foods.minDuration")}</span>
              </label>
              <input
                type="number"
                min={0}
                className="input input-bordered w-full"
                value={minDur}
                onChange={(e) => setMinDur(Number(e.target.value))}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("foods.maxDuration")}</span>
              </label>
              <input
                type="number"
                min={0}
                className="input input-bordered w-full"
                value={maxDur}
                onChange={(e) => setMaxDur(Number(e.target.value))}
              />
            </div>
          </div>
          {err && <div className="alert alert-error text-sm">{err}</div>}
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary" onClick={save}>
              {isNew ? t("common.create") : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
