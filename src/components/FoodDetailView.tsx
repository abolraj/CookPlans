import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Food, FoodStep } from "../lib/types";
import { minutesToTime, minutesToInput, timeToMinutes } from "../lib/types";
import FoodFormModal from "./FoodFormModal";
import StepFormModal from "./StepFormModal";

type DurationMode = "normal" | "max" | "min";

export default function FoodDetailView({
  foodId,
  onBack,
}: {
  foodId: number;
  onBack: () => void;
}) {
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
          ← Foods
        </button>
      </div>

      <div className="card bg-gradient-to-br from-primary/15 to-secondary/10 border border-primary/20">
        <div className="card-body p-5">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="text-4xl">🥘</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold break-words">{food.name}</h1>
              <div className="text-xs uppercase tracking-wider opacity-50">{food.slug}</div>
              {food.description && (
                <p className="text-sm opacity-70 mt-2">{food.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="badge badge-primary badge-outline">
                  {food.minDuration}–{food.maxDuration} min
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <button className="btn btn-sm btn-ghost" onClick={() => setEditingFood(true)}>
                Edit
              </button>
              <button
                className="btn btn-sm btn-error btn-outline"
                onClick={async () => {
                  if (!confirm("Delete this food and all its steps?")) return;
                  await api.deleteFood(food.id);
                  onBack();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Steps</h2>
        <div className="join">
          <button
            className={`btn btn-sm join-item ${mode === "normal" ? "btn-active btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("normal")}
          >
            Normal
          </button>
          <button
            className={`btn btn-sm join-item ${mode === "max" ? "btn-active btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("max")}
          >
            Max
          </button>
          <button
            className={`btn btn-sm join-item ${mode === "min" ? "btn-active btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("min")}
          >
            Min
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="opacity-60">Preview from</span>
          <input
            type="time"
            className="input input-xs input-bordered"
            value={minutesToInput(previewStart)}
            onChange={(e) => setPreviewStart(timeToMinutes(e.target.value))}
          />
        </div>
        <div className="flex-1" />
        <button className="btn btn-sm btn-primary" onClick={() => setStepModal({})}>
          + Add Step
        </button>
      </div>

      {steps.length === 0 && (
        <div className="card bg-base-200 p-6 text-center opacity-60">No steps yet.</div>
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
            <div className="card-body p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold">{s.name}</div>
                {s.isCurrent && <span className="badge badge-primary badge-sm">Now</span>}
                <div className="flex-1" />
                <button className="btn btn-xs btn-ghost" onClick={() => setStepModal({ step: s })}>
                  Edit
                </button>
                <button
                  className="btn btn-xs btn-ghost text-error"
                  onClick={async () => {
                    if (!confirm("Delete this step?")) return;
                    await api.deleteStep(s.id);
                    reloadSteps();
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="text-xs opacity-70 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <span>🕐 {minutesToTime(s.startAt)} → {minutesToTime(s.endAt)}</span>
                <span>⏱ {s.dur} min</span>
                <span>offset {s.offsetTime}m</span>
              </div>
              {s.description && <p className="text-sm opacity-70 mt-1">{s.description}</p>}
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
