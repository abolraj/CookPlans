import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Plan } from "../lib/types";
import WeekView from "./WeekView";
import { useI18n } from "../lib/i18n";

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "plan"
  );
}

export default function PlansView({ onOpenFood }: { onOpenFood: (id: number) => void }) {
  const { t, weekdayName } = useI18n();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      setPlans(await api.listPlans());
    } catch (e) {
      setErr(String(e));
    }
  }

  async function deletePlan(p: Plan) {
    const msg = p.isActive
      ? t("plans.deleteActiveConfirm", { name: p.name })
      : t("plans.deleteConfirm", { name: p.name });
    if (!confirm(msg)) return;
    try {
      await api.deletePlan(p.id);
      if (selected?.id === p.id) setSelected(null);
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn btn-sm btn-ghost shrink-0"
            onClick={() => {
              setSelected(null);
              refresh();
            }}
          >
            {t("plans.backToPlans")}
          </button>
          <h1 className="text-2xl font-bold break-words min-w-0">{selected.name}</h1>
          {selected.isActive && (
            <span className="badge badge-primary shrink-0">{t("plans.active")}</span>
          )}
          <div className="flex-1 min-w-0" />
          {!selected.isActive && (
            <button
              className="btn btn-primary btn-sm shrink-0"
              onClick={async () => {
                await api.setActivePlan(selected.id);
                setSelected({ ...selected, isActive: true });
              }}
            >
              {t("plans.setActive")}
            </button>
          )}
          <button
            className="btn btn-error btn-outline btn-sm shrink-0"
            onClick={() => deletePlan(selected)}
          >
            {t("common.delete")}
          </button>
        </div>
        {selected.description && (
          <p className="text-sm opacity-70 break-words">{selected.description}</p>
        )}
        <WeekView
          plan={selected}
          onPlanUpdated={(p) => setSelected(p)}
          onOpenFood={onOpenFood}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t("plans.title")}</h1>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          {t("plans.newPlan")}
        </button>
      </div>

      {err && <div className="alert alert-error text-sm">{err}</div>}

      {plans.length === 0 ? (
        <div className="card bg-base-200 p-8 text-center opacity-70">{t("plans.empty")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {plans.map((p) => (
            <div key={p.id} className="group relative">
              <div
                onClick={() => setSelected(p)}
                className={`card bg-base-200 border-2 transition cursor-pointer hover:-translate-y-0.5 hover:shadow-xl ${
                  p.isActive
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-base-300 hover:border-primary/60"
                }`}
              >
                <div className="card-body p-5 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="text-3xl shrink-0">📖</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight break-words">
                        {p.name}
                      </h3>
                      <div className="text-[11px] uppercase tracking-wider opacity-50 mt-0.5 break-all">
                        {p.slug}
                      </div>
                    </div>
                    {p.isActive && (
                      <span className="badge badge-primary badge-sm shrink-0">
                        {t("plans.active")}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-sm opacity-70 mt-2 leading-snug break-words">
                      {p.description}
                    </p>
                  )}
                  <div className="divider my-2" />
                  <div className="text-xs opacity-60 flex items-center gap-2 min-w-0 pe-8">
                    <span className="truncate">
                      🗓 {t("plans.startsOn", { day: weekdayName(p.startWeekday) })}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePlan(p);
                }}
                className="absolute bottom-2 end-2 z-10 btn btn-xs btn-ghost text-error opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                title={t("common.delete")}
                aria-label={t("common.delete")}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePlanModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function CreatePlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t, weekdayName } = useI18n();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [startWeekday, setStartWeekday] = useState(6);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setErr(t("common.nameRequired"));
      return;
    }
    try {
      await api.createPlan({
        name: name.trim(),
        description: desc.trim() || undefined,
        slug: slugify(name),
        startWeekday,
      });
      onCreated();
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
        className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">{t("plans.newPlanTitle")}</h2>
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
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t("plans.weekStartsOn")}</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={startWeekday}
              onChange={(e) => setStartWeekday(Number(e.target.value))}
            >
              {[6, 0, 1, 2, 3, 4, 5].map((i) => (
                <option key={i} value={i}>
                  {weekdayName(i)}
                </option>
              ))}
            </select>
          </div>
          {err && <div className="alert alert-error text-sm">{err}</div>}
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary" onClick={submit}>
              {t("common.create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
