import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Plan, Food, PlanMealDetail } from "../lib/types";
import { MEAL_EMOJI, timeToMinutes, minutesToInput } from "../lib/types";
import { useI18n } from "../lib/i18n";
import { useConfirm } from "./ConfirmDialog";

export default function WeekView({
  plan,
  onPlanUpdated,
  onOpenFood,
}: {
  plan: Plan;
  onPlanUpdated: (p: Plan) => void;
  onOpenFood: (id: number) => void;
}) {
  const { t, weekdayName, formatTime } = useI18n();
  const askConfirm = useConfirm();
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
  const currentStep = allSteps
    .filter((s) => s.startAt <= nowMin && s.endAt > nowMin)
    .sort((a, b) => a.startAt - b.startAt)[0];
  const nextStep = allSteps
    .filter((s) => s.startAt > nowMin)
    .sort((a, b) => a.startAt - b.startAt)[0];

  return (
    <div className="space-y-4">
      {err && <div className="alert alert-error text-sm">{err}</div>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="opacity-60">{t("week.weekStartsOn")}</span>
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
          {[6, 0, 1, 2, 3, 4, 5].map((i) => (
            <option key={i} value={i}>
              {weekdayName(i)}
            </option>
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
              className={`card border-2 p-2 sm:p-3 flex flex-col items-center justify-center min-h-[92px] transition ${isFocused
                  ? "bg-primary/20 border-primary shadow-lg"
                  : "bg-base-200 border-base-300 hover:border-primary/50"
                }`}
            >
              <div
                className={`text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest font-semibold text-center break-words leading-tight ${isFocused ? "text-primary" : "opacity-60"
                  }`}
              >
                {weekdayName(weekday)}
                {isToday && <span className="ms-1 text-[10px] text-success">●</span>}
              </div>
              <div
                className={`text-3xl font-bold leading-none mt-1 tabular-nums ${count === 0 ? "opacity-30" : ""
                  }`}
                dir="ltr"
              >
                {count}
              </div>
              <div className="text-[10px] opacity-50 mt-0.5 whitespace-nowrap">
                {count === 1 ? t("week.mealSingular") : t("week.mealPlural")}
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-lg break-words min-w-0">
            {t("week.dayMeals", { day: weekdayName(focusedDay) })}
          </h3>
          <span className="badge badge-ghost tabular-nums shrink-0" dir="ltr">
            {focusedMeals.length}
          </span>
          <div className="flex-1" />
          <button
            className="btn btn-primary btn-sm shrink-0"
            onClick={() => setEditing({ weekday: focusedDay })}
          >
            {t("week.addMeal")}
          </button>
        </div>

        {currentStep && (
          <div className="card bg-success/10 border-2 border-success/40">
            <div className="card-body p-4 flex-row items-center gap-4 flex-wrap">
              <div className="text-3xl shrink-0">🍳</div>
              <div className="flex-1 min-w-[180px]">
                <div className="text-xs uppercase tracking-wider text-success font-bold">
                  {t("week.currentMeal")}
                </div>
                <div className="font-semibold break-words text-base sm:text-lg">
                  {currentStep.foodName} · {currentStep.name}
                </div>
                <div className="rtl:text-right mt-1 flex flex-wrap gap-2 items-baseline">
                  <span dir="ltr">
                    <bdi className="text-lg font-semibold tabular-nums">
                      {formatTime(currentStep.startAt)}
                    </bdi>
                    <span className="opacity-50">→</span>
                    <bdi className="text-lg font-semibold tabular-nums opacity-80">
                      {formatTime(currentStep.endAt)}
                    </bdi>
                    <bdi className="text-sm opacity-60 tabular-nums">
                      ({currentStep.duration}m)
                    </bdi>
                  </span>
                </div>
              </div>
              <div className="text-end shrink-0">
                <div className="text-xs uppercase tracking-wider opacity-60">
                  {t("week.mealLabel")}
                </div>
                <div className="font-semibold text-sm break-words">
                  {currentStep.mealName}
                </div>
              </div>
            </div>
          </div>
        )}

        {nextStep && (
          <div className="card bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30">
            <div className="card-body p-4 flex-row items-center gap-4 flex-wrap">
              <div className="text-3xl shrink-0">⏳</div>
              <div className="flex-1 min-w-[180px]">
                <div className="text-xs uppercase tracking-wider opacity-70">
                  {t("week.nextStep")}
                </div>
                <div className="font-semibold break-words text-base sm:text-lg">
                  {nextStep.foodName} · {nextStep.name}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 items-baseline">
                  <span className="text-xs uppercase tracking-wider opacity-60">
                    {t("week.at")}
                  </span>
                  <bdi dir="ltr" className="text-2xl font-bold tabular-nums text-primary">
                    {formatTime(nextStep.startAt)}
                  </bdi>
                  <bdi dir="ltr" className="text-sm opacity-70 tabular-nums">
                    ({nextStep.duration}m)
                  </bdi>
                </div>
              </div>
              <div className="text-end shrink-0">
                <div className="text-xs uppercase tracking-wider opacity-70">{t("week.in")}</div>
                <div className="text-3xl font-mono font-bold tabular-nums" dir="ltr">
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
              <div className="opacity-60 mb-3 break-words">
                {t("week.noMeals", { day: weekdayName(focusedDay) })}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setEditing({ weekday: focusedDay })}
              >
                {t("week.addMeal")}
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
                const ok = await askConfirm({
                  message: t("week.deleteMealConfirm", {
                    name: m.details.meal.name,
                  }),
                  danger: true,
                  confirmLabel: t("common.delete"),
                  cancelLabel: t("common.cancel"),
                });
                if (!ok) return;
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
  const { t, formatTime } = useI18n();
  const { meal, food, cookStartAt, steps } = detail.details;
  const currentStep = steps.find((s) => s.startAt <= nowMin && s.endAt > nowMin);

  return (
    <div className="card bg-base-200 border border-base-300">
      <div className="card-body p-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl shrink-0">{MEAL_EMOJI[meal.mealType] ?? "🍽"}</span>
          <div className="font-semibold break-words min-w-0">{meal.name}</div>
          <span className="badge badge-ghost badge-sm shrink-0">
            {t(`week.mealTypes.${meal.mealType}` as any)}
          </span>
          {currentStep && (
            <span className="badge badge-primary badge-sm shrink-0">
              {t("common.now")}: {currentStep.name}
            </span>
          )}
          <div className="flex-1" />
          <button className="btn btn-xs btn-ghost shrink-0" onClick={onEdit}>
            {t("common.edit")}
          </button>
          <button className="btn btn-xs btn-ghost text-error shrink-0" onClick={onDelete}>
            ✕
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-80 mt-1">
          <span className="whitespace-nowrap">
            🍽 <bdi dir="ltr" className="tabular-nums">{formatTime(meal.deadlineAt)}</bdi>
          </span>
          <span className="whitespace-nowrap">
            🔥 <bdi dir="ltr" className="tabular-nums">{formatTime(cookStartAt)}</bdi>
          </span>
          <span className="whitespace-nowrap">
            ⏱ <bdi dir="ltr" className="tabular-nums">{food.maxDuration}m</bdi>
          </span>
          <span className="opacity-40">·</span>
          <button
            className="link link-primary font-medium break-words text-start"
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
                  dir="ltr"
                  className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${isCurrent
                      ? "bg-primary/20 border border-primary/50"
                      : isPast
                        ? "opacity-40"
                        : "bg-base-300/40"
                    }`}
                >
                  <bdi dir="ltr" className="font-mono whitespace-nowrap tabular-nums">
                    {formatTime(s.startAt)}
                  </bdi>
                  <span className="opacity-40">→</span>
                  <bdi
                    dir="ltr"
                    className="font-mono whitespace-nowrap opacity-70 tabular-nums"
                  >
                    {formatTime(s.endAt)}
                  </bdi>
                  <span className="flex-1 truncate min-w-0">{s.name}</span>
                  <bdi dir="ltr" className="opacity-50 whitespace-nowrap tabular-nums">
                    {s.duration}m
                  </bdi>
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
  const { t, weekdayName } = useI18n();
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
      setErr(t("common.nameRequired"));
      return;
    }
    if (!foodId) {
      setErr(t("week.pickFood"));
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
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 border-[3px] border-base-content shadow-[6px_6px_0_var(--color-base-content)] w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xl shrink-0">{MEAL_EMOJI[type] ?? "🍽"}</span>
            <h2 className="text-xl font-bold break-words min-w-0">
              {existing ? t("week.editMeal") : t("week.newMeal")}{" "}
              <span className="opacity-50 font-normal">· {weekdayName(weekday)}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-control md:col-span-2">
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
                <span className="label-text">{t("week.type")}</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="breakfast">🌅 {t("week.mealTypes.breakfast")}</option>
                <option value="lunch">☀️ {t("week.mealTypes.lunch")}</option>
                <option value="dinner">🌙 {t("week.mealTypes.dinner")}</option>
                <option value="snack">🍪 {t("week.mealTypes.snack")}</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("week.readyTime")}</span>
              </label>
              <input
                type="time"
                className="input input-bordered w-full"
                dir="ltr"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">{t("week.food")}</span>
              </label>
              {foods.length === 0 ? (
                <div className="text-sm opacity-60">{t("week.noFoodsYet")}</div>
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
          </div>

          {err && <div className="alert alert-error text-sm">{err}</div>}

          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
              {busy ? <span className="loading loading-spinner loading-xs" /> : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
