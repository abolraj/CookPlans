import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Food, FoodStep } from "../lib/types";
import { minutesToInput, timeToMinutes } from "../lib/types";
import FoodFormModal from "./FoodFormModal";
import StepFormModal from "./StepFormModal";
import { useI18n } from "../lib/i18n";
import { useConfirm } from "./ConfirmDialog";

type DurationMode = "normal" | "max" | "min";

export default function FoodDetailView({
  foodId,
  onBack,
}: {
  foodId: number;
  onBack: () => void;
}) {
  const { t, formatTime } = useI18n();
  const askConfirm = useConfirm();
  const [food, setFood] = useState<Food | null>(null);
  const [steps, setSteps] = useState<FoodStep[]>([]);
  const [mode, setMode] = useState<DurationMode>("normal");
  const [previewStart, setPreviewStart] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  });
  const [editingFood, setEditingFood] = useState(false);
  const [stepModal, setStepModal] = useState<{ step?: FoodStep } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, s] = await Promise.all([
          api.getFood(foodId),
          api.listStepsForFood(foodId),
        ]);
        setFood(f);
        setSteps(s);
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, [foodId]);

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  async function reloadSteps() {
    try {
      setSteps(await api.listStepsForFood(foodId));
      window.dispatchEvent(new Event("cookplans:schedules-changed"));
    } catch (e) {
      setErr(String(e));
    }
  }

  if (err) return <div className="alert alert-error">{err}</div>;
  if (!food)
    return (
      <div className="p-6">
        <span className="loading loading-spinner" />
      </div>
    );

  const stepWindows = steps.map((s) => {
    const dur = mode === "max" ? s.maxDuration : mode === "min" ? s.minDuration : s.duration;
    const startAt = previewStart + s.offsetTime;
    const endAt = startAt + dur;
    const isCurrent = nowMin >= startAt && nowMin < endAt;
    const isPast = nowMin >= endAt;
    return { ...s, dur, startAt, endAt, isCurrent, isPast };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="btn btn-sm btn-ghost" onClick={onBack}>
          {t("foodDetail.backToFoods")}
        </button>
      </div>

      <div className="card bg-gradient-to-br from-primary/15 to-secondary/10 border border-primary/20">
        <div className="card-body p-5 min-w-0">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="text-4xl shrink-0">🥘</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold break-words">{food.name}</h1>
              <div className="text-xs uppercase tracking-wider opacity-50 break-all">
                {food.slug}
              </div>
              {food.description && (
                <p className="text-sm opacity-70 mt-2 break-words">{food.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="badge badge-primary badge-outline">
                  <bdi dir="ltr" className="tabular-nums">{food.minDuration}–{food.maxDuration}</bdi>{" "}
                  {t("units.min")}
                </span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button className="btn btn-sm btn-ghost" onClick={() => setEditingFood(true)}>
                {t("common.edit")}
              </button>
              <button
                className="btn btn-sm btn-error btn-outline"
                onClick={async () => {
                  const ok = await askConfirm({
                    message: t("foodDetail.deleteFoodConfirm"),
                    danger: true,
                    confirmLabel: t("common.delete"),
                    cancelLabel: t("common.cancel"),
                  });
                  if (!ok) return;
                  await api.deleteFood(food.id);
                  window.dispatchEvent(new Event("cookplans:schedules-changed"));
                  onBack();
                }}
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">{t("foodDetail.steps")}</h2>
        <div className="join">
          <button
            className={`btn btn-sm join-item ${
              mode === "normal" ? "btn-active btn-primary" : "btn-ghost"
            }`}
            onClick={() => setMode("normal")}
          >
            {t("foodDetail.normal")}
          </button>
          <button
            className={`btn btn-sm join-item ${
              mode === "max" ? "btn-active btn-primary" : "btn-ghost"
            }`}
            onClick={() => setMode("max")}
          >
            {t("foodDetail.max")}
          </button>
          <button
            className={`btn btn-sm join-item ${
              mode === "min" ? "btn-active btn-primary" : "btn-ghost"
            }`}
            onClick={() => setMode("min")}
          >
            {t("foodDetail.min")}
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="opacity-60">{t("foodDetail.previewFrom")}</span>
          <input
            type="time"
            dir="ltr"
            className="input input-xs input-bordered"
            value={minutesToInput(previewStart)}
            onChange={(e) => setPreviewStart(timeToMinutes(e.target.value))}
          />
        </div>
        <div className="flex-1" />
        <button className="btn btn-sm btn-primary" onClick={() => setStepModal({})}>
          {t("foodDetail.addStep")}
        </button>
      </div>

      {steps.length === 0 && (
        <div className="card bg-base-200 p-6 text-center opacity-60">
          {t("foodDetail.noSteps")}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {stepWindows.map((s) => (
          <div
            key={s.id}
            className={`card border-2 transition ${
              s.isCurrent
                ? "bg-primary/15 border-primary shadow-lg"
                : s.isPast
                ? "bg-base-200/40 border-base-300 opacity-50"
                : "bg-base-200 border-base-300"
            }`}
          >
            <div className="card-body p-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold break-words min-w-0">{s.name}</div>
                {s.isCurrent && (
                  <span className="badge badge-primary badge-sm shrink-0">
                    {t("common.now")}
                  </span>
                )}
                <div className="flex-1" />
                <button
                  className="btn btn-xs btn-ghost shrink-0"
                  onClick={() => setStepModal({ step: s })}
                >
                  {t("common.edit")}
                </button>
                <button
                  className="btn btn-xs btn-ghost text-error shrink-0"
                  onClick={async () => {
                    const ok = await askConfirm({
                      message: t("foodDetail.deleteStepConfirm"),
                      danger: true,
                      confirmLabel: t("common.delete"),
                      cancelLabel: t("common.cancel"),
                    });
                    if (!ok) return;
                    await api.deleteStep(s.id);
                    reloadSteps();
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="text-xs opacity-70 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  🕐
                  <bdi dir="ltr" className="tabular-nums">{formatTime(s.startAt)}</bdi>
                  <span className="opacity-50">→</span>
                  <bdi dir="ltr" className="tabular-nums">{formatTime(s.endAt)}</bdi>
                </span>
                <span className="whitespace-nowrap">
                  ⏱ <bdi dir="ltr" className="tabular-nums">{s.dur}m</bdi>
                </span>
                <span className="whitespace-nowrap">
                  {t("foodDetail.offset", { value: "" })}
                  <bdi dir="ltr" className="tabular-nums">{s.offsetTime}m</bdi>
                </span>
              </div>
              {s.description && (
                <p className="text-sm opacity-70 mt-1 break-words">{s.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingFood && (
        <FoodFormModal
          food={food}
          onClose={() => setEditingFood(false)}
          onSaved={async () => {
            try {
              const f = await api.getFood(food.id);
              setFood(f);
            } catch (e) {
              setErr(String(e));
            }
            setEditingFood(false);
            window.dispatchEvent(new Event("cookplans:schedules-changed"));
          }}
        />
      )}
      {stepModal && (
        <StepFormModal
          foodId={food.id}
          step={stepModal.step}
          onClose={() => setStepModal(null)}
          onSaved={() => {
            setStepModal(null);
            reloadSteps();
          }}
        />
      )}
    </div>
  );
}
