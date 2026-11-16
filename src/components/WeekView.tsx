import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Plan, Food, PlanMealDetail } from "../lib/types";
import { FULL_WEEKDAYS, MEAL_EMOJI, minutesToTime, timeToMinutes, minutesToInput } from "../lib/types";

export default function WeekView({
  plan,
  onPlanUpdated,
  onOpenFood,
}: {
  plan: Plan;
  onPlanUpdated: (p: Plan) => void;
  onOpenFood: (id: number) => void;
}) {
  const [weekDetails, setWeekDetails] = useState<PlanMealDetail[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [focusedDay, setFocusedDay] = useState<number>(() => new Date().getDay());
  const [editing, setEditing] = useState<{ weekday: number; detail?: PlanMealDetail } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  });

  const dayOrder = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 7; i++) arr.push((plan.startWeekday + i) % 7);
    return arr;
  }, [plan.startWeekday]);

  async function refresh() {
    try {
      const [details, fs] = await Promise.all([
        api.getPlanWeekDetails(plan.id),
        api.listFoods(),
      ]);
      setWeekDetails(details);
      setFoods(fs);
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, [plan.id]);

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mealCountByDay = useMemo(() => {
    const m: Record<number, number> = {};
    for (const d of weekDetails) m[d.weekday] = (m[d.weekday] ?? 0) + 1;
    return m;
  }, [weekDetails]);

  const focusedMeals = weekDetails
    .filter((d) => d.weekday === focusedDay)
    .sort((a, b) => a.details.meal.deadlineAt - b.details.meal.deadlineAt);

  const allSteps = focusedMeals.flatMap((m) =>
    m.details.steps.map((s) => ({
      ...s,
      mealName: m.details.meal.name,
      foodName: m.details.food.name,
      planMealId: m.planMealId,
    }))
  );
  const nextStep = allSteps
    .filter((s) => s.startAt > nowMin)
    .sort((a, b) => a.startAt - b.startAt)[0];

  return (
    <div className="space-y-4">
      {err && <div className="alert alert-error text-sm">{err}</div>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="opacity-60">Week starts on:</span>
        <select
          className="select select-sm select-bordered"
          value={plan.startWeekday}
          onChange={async (e) => {
            const val = Number(e.target.value);
            await api.updatePlan({
              id: plan.id,
              name: plan.name,
              description: plan.description ?? undefined,
              slug: plan.slug,
              startWeekday: val,
            });
            onPlanUpdated({ ...plan, startWeekday: val });
          }}
        >
          {FULL_WEEKDAYS.map((d, i) => (
            <option key={i} value={i}>{d}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {dayOrder.map((weekday) => {
          const count = mealCountByDay[weekday] ?? 0;
          const isFocused = focusedDay === weekday;
          const isToday = new Date().getDay() === weekday;
          return (
            <button
              key={weekday}
              onClick={() => setFocusedDay(weekday)}
              className={`card border-2 p-3 flex flex-col items-center justify-center min-h-[92px] transition ${
                isFocused
                  ? "bg-primary/20 border-primary shadow-lg"
                  : "bg-base-200 border-base-300 hover:border-primary/50"
              }`}
            >
              <div
                className={`text-xs uppercase tracking-widest font-semibold ${
                  isFocused ? "text-primary" : "opacity-60"
                }`}
              >
                {FULL_WEEKDAYS[weekday]}
                {isToday && <span className="ml-1 text-[10px] text-success">●</span>}
              </div>
              <div className={`text-3xl font-bold leading-none mt-1 ${count === 0 ? "opacity-30" : ""}`}>
                {count}
              </div>
              <div className="text-[10px] opacity-50 mt-0.5">
                {count === 1 ? "meal" : "meals"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-lg">{FULL_WEEKDAYS[focusedDay]}'s meals</h3>
          <span className="badge badge-ghost">{focusedMeals.length}</span>
          <div className="flex-1" />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setEditing({ weekday: focusedDay })}
          >
            + Add Meal
          </button>
        </div>

        {nextStep && (
          <div className="card bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30">
            <div className="card-body p-4 flex-row items-center gap-4 flex-wrap">
              <div className="text-3xl">⏳</div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-xs uppercase tracking-wider opacity-70">Next step</div>
                <div className="font-semibold">
                  {nextStep.foodName} · {nextStep.name}
                </div>
                <div className="text-xs opacity-60 mt-0.5">
                  at {minutesToTime(nextStep.startAt)} · {nextStep.duration}m
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider opacity-70">in</div>
                <div className="text-3xl font-mono font-bold tabular-nums">
                  {(() => {
                    const total = Math.max(0, Math.floor((nextStep.startAt - nowMin) * 60));
                    const mm = Math.floor(total / 60);
                    const ss = total % 60;
                    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {focusedMeals.length === 0 && (
            <div className="card bg-base-200 border-2 border-dashed border-base-300 p-8 text-center">
              <div className="opacity-60 mb-3">No meals planned for {FULL_WEEKDAYS[focusedDay]}.</div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setEditing({ weekday: focusedDay })}
              >
                + Add Meal
              </button>
            </div>
          )}
          {focusedMeals.map((m) => (
            <MealRow
              key={m.planMealId}
              detail={m}
              nowMin={nowMin}
              onOpenFood={onOpenFood}
              onEdit={() => setEditing({ weekday: focusedDay, detail: m })}
              onDelete={async () => {
                if (!confirm(`Delete meal "${m.details.meal.name}"?`)) return;
                await api.deleteMeal(m.details.meal.id);
                refresh();
              }}
            />
          ))}
        </div>
      </div>

      {editing && (
        <MealEditor
          plan={plan}
          weekday={editing.weekday}
          existing={editing.detail}
          foods={foods}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function MealRow({
  detail,
  nowMin,
  onOpenFood,
  onEdit,
  onDelete,
}: {
  detail: PlanMealDetail;
  nowMin: number;
  onOpenFood: (id: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { meal, food, cookStartAt, cookEndAt, steps } = detail.details;
  const currentStep = steps.find((s) => s.startAt <= nowMin && s.endAt > nowMin);

  return (
    <div className="card bg-base-200 border border-base-300">
      <div className="card-body p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl">{MEAL_EMOJI[meal.mealType] ?? "🍽"}</span>
          <div className="font-semibold">{meal.name}</div>
          <span className="badge badge-ghost badge-sm capitalize">{meal.mealType}</span>
          {currentStep && (
            <span className="badge badge-primary badge-sm">now: {currentStep.name}</span>
          )}
          <div className="flex-1" />
          <button className="btn btn-xs btn-ghost" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-xs btn-ghost text-error" onClick={onDelete}>
            ✕
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-80 mt-1">
          <span>🍽 ready {minutesToTime(meal.deadlineAt)}</span>
          <span>🔥 start {minutesToTime(cookStartAt)}</span>
          <span>⏱ {food.maxDuration}m</span>
          <span>·</span>
          <button
            className="link link-primary font-medium"
            onClick={() => onOpenFood(food.id)}
          >
            {food.name} ↗
          </button>
        </div>
        {steps.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {steps.map((s) => {
              const isCurrent = s.startAt <= nowMin && s.endAt > nowMin;
              const isPast = s.endAt <= nowMin;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                    isCurrent
                      ? "bg-primary/20 border border-primary/50"
                      : isPast
                      ? "opacity-40"
                      : "bg-base-300/40"
                  }`}
                >
                  <span className="font-mono whitespace-nowrap">
                    {minutesToTime(s.startAt)}
                  </span>
                  <span className="opacity-40">→</span>
                  <span className="font-mono whitespace-nowrap opacity-70">
                    {minutesToTime(s.endAt)}
                  </span>
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="opacity-50 whitespace-nowrap">{s.duration}m</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MealEditor({
  plan,
  weekday,
  existing,
  foods,
  onClose,
  onSaved,
}: {
  plan: Plan;
  weekday: number;
  existing?: PlanMealDetail;
  foods: Food[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.details.meal.name ?? "");
  const [desc, setDesc] = useState(existing?.details.meal.description ?? "");
  const [type, setType] = useState(existing?.details.meal.mealType ?? "breakfast");
  const [deadline, setDeadline] = useState(
    existing ? minutesToInput(existing.details.meal.deadlineAt) : "08:00"
  );
  const [foodId, setFoodId] = useState<number>(
    existing?.details.meal.foodId ?? (foods[0]?.id ?? 0)
  );
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    if (!foodId) {
      setErr("Pick a food — you need at least one food in Foods tab.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (existing) {
        await api.updateMeal({
          mealId: existing.details.meal.id,
          name: name.trim(),
          description: desc.trim() || undefined,
          mealType: type,
          deadlineAt: timeToMinutes(deadline),
          foodId,
        });
      } else {
        await api.createMeal({
          planId: plan.id,
          weekday,
          name: name.trim(),
          description: desc.trim() || undefined,
          mealType: type,
          deadlineAt: timeToMinutes(deadline),
          foodId,
        });
      }
      onSaved();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
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
          <div className="flex items-center gap-2">
            <span className="text-3xl">{MEAL_EMOJI[type] ?? "🍽"}</span>
            <h2 className="text-xl font-bold">
              {existing ? "Edit Meal" : "New Meal"}{" "}
              <span className="opacity-50 font-normal">· {FULL_WEEKDAYS[weekday]}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-control md:col-span-2">
              <label className="label"><span className="label-text">Name</span></label>
              <input
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Type</span></label>
              <select
                className="select select-bordered w-full"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="breakfast">🌅 Breakfast</option>
                <option value="lunch">☀️ Lunch</option>
                <option value="dinner">🌙 Dinner</option>
                <option value="snack">🍪 Snack</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Ready at</span></label>
              <input
                type="time"
                className="input input-bordered w-full"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label"><span className="label-text">Food</span></label>
              {foods.length === 0 ? (
                <div className="text-sm opacity-60">No foods yet — create one in the Foods tab.</div>
              ) : (
                <select
                  className="select select-bordered w-full"
                  value={foodId}
                  onChange={(e) => setFoodId(Number(e.target.value))}
                >
                  {foods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.maxDuration}m)
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-control md:col-span-2">
              <label className="label"><span className="label-text">Description</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={2}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>

          {err && <div className="alert alert-error text-sm">{err}</div>}

          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
              {busy ? <span className="loading loading-spinner loading-xs" /> : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
