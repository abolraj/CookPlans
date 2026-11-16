import { useState } from "react";
import { api } from "../lib/api";
import type { FoodStep } from "../lib/types";
import { useI18n } from "../lib/i18n";

export default function StepFormModal({
  foodId,
  step,
  onClose,
  onSaved,
}: {
  foodId: number;
  step?: FoodStep;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const isNew = !step;
  const [name, setName] = useState(step?.name ?? "");
  const [desc, setDesc] = useState(step?.description ?? "");
  const [offset, setOffset] = useState(step?.offsetTime ?? 0);
  const [duration, setDuration] = useState(step?.duration ?? 5);
  const [minDur, setMinDur] = useState(step?.minDuration ?? 3);
  const [maxDur, setMaxDur] = useState(step?.maxDuration ?? 8);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setErr(t("common.nameRequired"));
      return;
    }
    try {
      if (isNew) {
        await api.createStep({
          foodId,
          name: name.trim(),
          description: desc.trim() || undefined,
          offsetTime: Number(offset) || 0,
          duration: Number(duration) || 0,
          minDuration: Number(minDur) || 0,
          maxDuration: Number(maxDur) || 0,
        });
      } else {
        await api.updateStep({
          id: step!.id,
          name: name.trim(),
          description: desc.trim() || undefined,
          offsetTime: Number(offset) || 0,
          duration: Number(duration) || 0,
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
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 border-[3px] border-base-content shadow-[6px_6px_0_var(--color-base-content)] w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">
            {isNew ? t("step.newStep") : t("step.editStep")}
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
                <span className="label-text">{t("step.offset")}</span>
              </label>
              <input
                type="number"
                min={0}
                className="input input-bordered w-full"
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("step.duration")}</span>
              </label>
              <input
                type="number"
                min={0}
                className="input input-bordered w-full"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("step.minDuration")}</span>
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
                <span className="label-text">{t("step.maxDuration")}</span>
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
