import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Food, FoodStep } from "../lib/types";

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "food"
  );
}

export default function FoodsView() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [editing, setEditing] = useState<Food | null>(null);
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
        <h1 className="text-2xl font-bold">Foods</h1>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          + New Food
        </button>
      </div>

      {err && <div className="alert alert-error text-sm">{err}</div>}

      {foods.length === 0 ? (
        <div className="card bg-base-200 p-8 text-center opacity-70">
          No foods yet. Create your first food or import a bundle.
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
          {foods.map((f) => (
            <div key={f.id} className="mb-4 break-inside-avoid">
              <button
                onClick={() => setEditing(f)}
                className="card bg-base-200 border-2 border-base-300 hover:border-primary transition text-left w-full hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="card-body p-4">
                  <div className="flex items-start gap-2">
                    <div className="text-3xl">🥘</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-tight break-words">{f.name}</h3>
                      <div className="text-[11px] uppercase tracking-wider opacity-50 mt-0.5">
                        {f.slug}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="badge badge-sm badge-ghost">⏱ {f.minDuration}–{f.maxDuration}m</span>
                  </div>
                  {f.description && (
                    <p className="text-sm opacity-70 mt-2 leading-snug">{f.description}</p>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <FoodEditor
          food={editing ?? null}
          isNew={creating}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function FoodEditor({
  food,
  isNew,
  onClose,
  onSaved,
}: {
  food: Food | null;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(food?.name ?? "");
  const [desc, setDesc] = useState(food?.description ?? "");
  const [minDur, setMinDur] = useState(food?.minDuration ?? 10);
  const [maxDur, setMaxDur] = useState(food?.maxDuration ?? 20);
  const [savedFood, setSavedFood] = useState<Food | null>(food);
  const [steps, setSteps] = useState<FoodStep[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function loadSteps(id: number) {
    try {
      setSteps(await api.listStepsForFood(id));
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    if (savedFood) loadSteps(savedFood.id);
  }, [savedFood?.id]);

  async function saveFood() {
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    try {
      if (isNew || !savedFood) {
        const created = await api.createFood({
          name: name.trim(),
          slug: slugify(name),
          description: desc.trim() || undefined,
          minDuration: Number(minDur) || 0,
          maxDuration: Number(maxDur) || 0,
        });
        setSavedFood(created);
        if (isNew) onSaved();
      } else {
        await api.updateFood({
          id: savedFood.id,
          name: name.trim(),
          slug: savedFood.slug,
          description: desc.trim() || undefined,
          minDuration: Number(minDur) || 0,
          maxDuration: Number(maxDur) || 0,
        });
        onSaved();
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  async function deleteFood() {
    if (!savedFood) return;
    if (!confirm("Delete this food and its steps?")) return;
    await api.deleteFood(savedFood.id);
    onSaved();
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
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">🥘</span>
            {isNew ? "New Food" : "Edit Food"}
          </h2>

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
            <div className="form-control md:col-span-2">
              <label className="label"><span className="label-text">Description</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={2}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Min duration (min)</span></label>
              <input
                type="number"
                min={0}
                className="input input-bordered w-full"
                value={minDur}
                onChange={(e) => setMinDur(Number(e.target.value))}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Max duration (min)</span></label>
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
            {savedFood && !isNew && (
              <button className="btn btn-error btn-outline btn-sm" onClick={deleteFood}>
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            <button className="btn btn-primary btn-sm" onClick={saveFood}>
              {savedFood && !isNew ? "Save" : "Create"}
            </button>
          </div>

          {savedFood && (
            <div className="border-t border-base-300 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="font-semibold">Steps</div>
                <div className="flex-1" />
                <StepForm foodId={savedFood.id} onCreated={() => loadSteps(savedFood.id)} />
              </div>
              <div className="space-y-2">
                {steps.length === 0 && (
                  <div className="text-sm opacity-60">No steps yet.</div>
                )}
                {steps.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg bg-base-200 border border-base-300">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="flex-1" />
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={async () => {
                          await api.deleteStep(s.id);
                          loadSteps(savedFood.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      Offset {s.offsetTime}m · Duration {s.duration}m
                    </div>
                    {s.description && (
                      <div className="text-xs opacity-70 mt-1">{s.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepForm({ foodId, onCreated }: { foodId: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [offset, setOffset] = useState(0);
  const [duration, setDuration] = useState(5);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setErr("Name required");
      return;
    }
    try {
      await api.createStep({
        foodId,
        name: name.trim(),
        description: desc.trim() || undefined,
        offsetTime: Number(offset) || 0,
        duration: Number(duration) || 0,
        minDuration: Number(duration) || 0,
        maxDuration: Number(duration) || 0,
      });
      setOpen(false);
      setName("");
      setDesc("");
      setOffset(0);
      setDuration(5);
      onCreated();
    } catch (e) {
      setErr(String(e));
    }
  }

  if (!open) {
    return (
      <button className="btn btn-sm btn-outline" onClick={() => setOpen(true)}>
        + Add Step
      </button>
    );
  }

  return (
    <div className="card bg-base-200 border border-base-300 w-full">
      <div className="card-body p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input input-sm input-bordered col-span-2"
            placeholder="Step name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            className="input input-sm input-bordered col-span-2"
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            type="number"
            className="input input-sm input-bordered"
            placeholder="Offset (m)"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
          />
          <input
            type="number"
            className="input input-sm input-bordered"
            placeholder="Duration (m)"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        {err && <div className="text-xs text-error">{err}</div>}
        <div className="flex justify-end gap-1">
          <button className="btn btn-xs btn-ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-xs btn-primary" onClick={submit}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
