import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { MealWithPlan, Plan, Food, ScheduledStep } from "../lib/types";
import { WEEKDAYS, MEAL_EMOJI, minutesToTime, timeToMinutes, minutesToInput } from "../lib/types";

export default function WeekView({ plan }: { plan: Plan }) {
  const [meals, setMeals] = useState<MealWithPlan[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [editing, setEditing] = useState<{ weekday: number; meal?: MealWithPlan } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      const [m, f] = await Promise.all([api.listMealsForPlan(plan.id), api.listFoods()]);
      setMeals(m);
      setFoods(f);
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, [plan.id]);

  return (
    <div className="space-y-4">
      {err && <div className="alert alert-error text-sm">{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {WEEKDAYS.map((day, i) => {
          const dayMeal = meals.find((m) => m.weekday === i);
          return (
            <div key={i} className="flex flex-col gap-2">
              <div className="text-[11px] uppercase tracking-widest opacity-60 text-center font-semibold">
                {day}
              </div>
              {dayMeal ? (
                <button
                  onClick={() => setEditing({ weekday: i, meal: dayMeal })}
                  className="card bg-base-200 border-2 border-base-300 hover:border-primary text-left transition flex flex-col min-h-[190px] hover:shadow-lg"
                >
                  <div className="card-body p-3 flex-1">
                    <div className="text-2xl leading-none">
                      {MEAL_EMOJI[dayMeal.meal.mealType] ?? "🍽"}
                    </div>
                    <div className="font-semibold text-sm leading-tight mt-1 break-words">
                      {dayMeal.meal.name}
                    </div>
                    <div>
                      <span className="badge badge-sm badge-ghost capitalize">
                        {dayMeal.meal.mealType}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-70 mt-auto pt-2 leading-relaxed">
                      <div>🍽 {minutesToTime(dayMeal.meal.deadlineAt)}</div>
                      {dayMeal.meal.startedAt != null && (
                        <div>🔥 {minutesToTime(dayMeal.meal.startedAt)}</div>
                      )}
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setEditing({ weekday: i })}
                  className="card bg-base-200/40 border-2 border-dashed border-base-300 hover:border-primary text-center transition flex flex-col min-h-[190px] hover:bg-base-200/70"
                >
                  <div className="flex-1 flex flex-col items-center justify-center gap-1">
                    <span className="text-3xl opacity-40">+</span>
                    <span className="text-xs opacity-60">Add Meal</span>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <MealEditor
          plan={plan}
          weekday={editing.weekday}
          existing={editing.meal}
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
  existing?: MealWithPlan;
  foods: Food[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.meal.name ?? "");
  const [desc, setDesc] = useState(existing?.meal.description ?? "");
  const [type, setType] = useState(existing?.meal.mealType ?? "breakfast");
  const [deadline, setDeadline] = useState(
    existing ? minutesToInput(existing.meal.deadlineAt) : "08:00"
  );
  const [foodIds, setFoodIds] = useState<number[]>([]);
  const [schedule, setSchedule] = useState<ScheduledStep[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (existing) {
        const ids = await api.getMealFoodIds(existing.meal.id);
        setFoodIds(ids);
      }
    })();
  }, [existing?.meal.id]);

  async function save() {
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (existing) {
        await api.updateMeal({
          mealId: existing.meal.id,
          name: name.trim(),
          description: desc.trim() || undefined,
          mealType: type,
          deadlineAt: timeToMinutes(deadline),
          foodIds,
        });
      } else {
        await api.createMeal({
          planId: plan.id,
          weekday,
          name: name.trim(),
          description: desc.trim() || undefined,
          mealType: type,
          deadlineAt: timeToMinutes(deadline),
          foodIds,
        });
      }
      onSaved();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    if (!confirm("Delete this meal?")) return;
    await api.deleteMeal(existing.meal.id);
    onSaved();
  }

  async function showSchedule() {
    if (!existing) {
      setErr("Save first to preview schedule");
      return;
    }
    try {
      const s = await api.computeMealSchedule(existing.meal.id);
      setSchedule(s);
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
        className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{MEAL_EMOJI[type] ?? "🍽"}</span>
            <h2 className="text-xl font-bold">
              {existing ? "Edit Meal" : "New Meal"}{" "}
              <span className="opacity-50 font-normal">· {WEEKDAYS[weekday]}</span>
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
              <label className="label"><span className="label-text">Description</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={2}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2 text-sm">Foods</div>
            {foods.length === 0 ? (
              <div className="text-sm opacity-60">No foods yet — add some in Foods tab.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                {foods.map((f) => {
                  const checked = foodIds.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        checked
                          ? "border-primary bg-primary/10"
                          : "border-base-300 hover:border-base-300/70 bg-base-200/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={checked}
                        onChange={(e) =>
                          setFoodIds((ids) =>
                            e.target.checked ? [...ids, f.id] : ids.filter((x) => x !== f.id)
                          )
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{f.name}</div>
                        <div className="text-[11px] opacity-60">
                          {f.minDuration}–{f.maxDuration} min
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {err && <div className="alert alert-error text-sm">{err}</div>}

          {schedule.length > 0 && (
            <div>
              <div className="font-semibold mb-2 text-sm">Schedule preview</div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {schedule.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-base-200 text-sm"
                  >
                    <span className="badge badge-sm badge-ghost whitespace-nowrap">
                      {minutesToTime(s.notifyAtMinutes)}
                    </span>
                    <span className="font-medium">{s.foodName}</span>
                    <span className="opacity-60">· {s.stepName}</span>
                    <span className="ml-auto text-xs opacity-60 whitespace-nowrap">
                      {s.duration}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-end pt-2">
            {existing && (
              <button className="btn btn-error btn-outline btn-sm" onClick={remove}>
                Delete
              </button>
            )}
            {existing && (
              <button className="btn btn-ghost btn-sm" onClick={showSchedule}>
                Preview Schedule
              </button>
            )}
            <div className="flex-1" />
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
              {busy ? <span className="loading loading-spinner loading-xs" /> : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
