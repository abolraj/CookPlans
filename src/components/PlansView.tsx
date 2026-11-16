import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Plan } from "../lib/types";
import { FULL_WEEKDAYS } from "../lib/types";
import WeekView from "./WeekView";

function slugify(s: string) {
  return (
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "plan"
  );
}

export default function PlansView({ onOpenFood }: { onOpenFood: (id: number) => void }) {
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

  useEffect(() => {
    refresh();
  }, []);

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setSelected(null);
              refresh();
            }}
          >
            ← Plans
          </button>
          <h1 className="text-2xl font-bold">{selected.name}</h1>
          {selected.isActive && <span className="badge badge-primary">Active</span>}
          <div className="flex-1" />
          {!selected.isActive && (
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                await api.setActivePlan(selected.id);
                setSelected({ ...selected, isActive: true });
              }}
            >
              Set as Active
            </button>
          )}
        </div>
        {selected.description && <p className="text-sm opacity-70">{selected.description}</p>}
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
        <h1 className="text-2xl font-bold">Plans</h1>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          + New Plan
        </button>
      </div>

      {err && <div className="alert alert-error text-sm">{err}</div>}

      {plans.length === 0 ? (
        <div className="card bg-base-200 p-8 text-center opacity-70">
          No plans yet. Create one or import a JSON bundle.
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
          {plans.map((p) => (
            <div key={p.id} className="mb-4 break-inside-avoid">
              <div
                onClick={() => setSelected(p)}
                className={`card bg-base-200 border-2 transition cursor-pointer hover:-translate-y-0.5 hover:shadow-xl ${
                  p.isActive
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-base-300 hover:border-primary/60"
                }`}
              >
                <div className="card-body p-5">
                  <div className="flex items-start gap-2">
                    <div className="text-3xl">📖</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight break-words">{p.name}</h3>
                      <div className="text-[11px] uppercase tracking-wider opacity-50 mt-0.5">
                        {p.slug}
                      </div>
                    </div>
                    {p.isActive && <span className="badge badge-primary badge-sm">Active</span>}
                  </div>
                  {p.description && (
                    <p className="text-sm opacity-70 mt-2 leading-snug">{p.description}</p>
                  )}
                  <div className="divider my-2" />
                  <div className="text-xs opacity-60 flex items-center gap-2">
                    <span>🗓 Starts {FULL_WEEKDAYS[p.startWeekday] ?? "Sunday"}</span>
                  </div>
                </div>
              </div>
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
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [startWeekday, setStartWeekday] = useState(6);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setErr("Name is required");
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
        className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">New Plan</h2>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Name</span>
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
              <span className="label-text">Description</span>
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
              <span className="label-text">Week starts on</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={startWeekday}
              onChange={(e) => setStartWeekday(Number(e.target.value))}
            >
              {FULL_WEEKDAYS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          {err && <div className="alert alert-error text-sm">{err}</div>}
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={submit}>Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}
