import { useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import type { ImportPayload, ImportResult } from "../lib/types";
import { AI_IMPORT_GUIDE } from "../lib/aiGuide";
import { useI18n } from "../lib/i18n";

const EXAMPLE = JSON.stringify(
  {
    plans: [
      {
        name: "My Week",
        slug: "my-week",
        description: "A sample imported plan.",
        isActive: true,
        startWeekday: 6,
      },
    ],
    foods: [
      {
        name: "Omelette",
        slug: "omelette",
        description: "Cheese omelette.",
        minDuration: 6,
        maxDuration: 10,
        steps: [
          {
            name: "Whisk eggs",
            description: "Beat eggs in a bowl.",
            duration: 2,
            minDuration: 1,
            maxDuration: 3,
            offsetTime: 0,
          },
          {
            name: "Cook",
            description: "Cook until set.",
            duration: 6,
            minDuration: 4,
            maxDuration: 8,
            offsetTime: 2,
          },
        ],
      },
    ],
    meals: [
      {
        planSlug: "my-week",
        weekday: 1,
        name: "Monday Omelette",
        mealType: "breakfast",
        deadlineAt: 480,
        foodSlug: "omelette",
      },
    ],
  },
  null,
  2
);

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function ImportView() {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo<{ ok: boolean; data?: ImportPayload; error?: string }>(() => {
    if (!text.trim()) return { ok: false };
    try {
      return { ok: true, data: JSON.parse(text) as ImportPayload };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }, [text]);

  async function doCopyGuide() {
    const ok = await copyText(AI_IMPORT_GUIDE);
    setCopied(ok ? t("import.guideCopied") : t("import.copyFailed"));
    setTimeout(() => setCopied(null), 2500);
  }

  async function doCopyExample() {
    const ok = await copyText(EXAMPLE);
    setCopied(ok ? t("import.exampleCopied") : t("import.copyFailed"));
    setTimeout(() => setCopied(null), 2500);
  }

  async function doImport() {
    if (!parsed.ok || !parsed.data) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const r = await api.importData(parsed.data);
      setResult(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
  }

  const counts =
    parsed.ok && parsed.data
      ? {
          plans: parsed.data.plans?.length ?? 0,
          foods: parsed.data.foods?.length ?? 0,
          meals: parsed.data.meals?.length ?? 0,
        }
      : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold break-words">{t("import.title")}</h1>
        <p className="text-sm opacity-70 mt-1 break-words">{t("import.description")}</p>
      </div>

      <div className="card bg-gradient-to-br from-primary/15 to-secondary/10 border border-primary/30">
        <div className="card-body p-4 sm:p-5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-3xl shrink-0">🤖</span>
              <div className="min-w-0">
                <div className="font-bold">{t("import.aiHelper")}</div>
                <div className="text-xs opacity-70 break-words">{t("import.aiHelperDesc")}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary btn-sm" onClick={doCopyGuide}>
                {t("import.copyGuide")}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={doCopyExample}>
                {t("import.copyExample")}
              </button>
            </div>
          </div>
          {copied && (
            <div className="alert alert-success text-sm py-2 mt-2">{copied}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3 min-w-0">
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-4 space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-primary">{t("import.pasteJson")}</span>
                <div className="flex-1" />
                <button className="btn btn-xs btn-ghost" onClick={() => setText(EXAMPLE)}>
                  {t("import.loadExample")}
                </button>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => {
                    setText("");
                    setResult(null);
                    setError(null);
                  }}
                >
                  {t("common.clear")}
                </button>
                <button className="btn btn-xs btn-ghost" onClick={() => fileRef.current?.click()}>
                  {t("import.uploadJson")}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={onFile}
                />
              </div>

              <textarea
                className="textarea textarea-bordered w-full font-mono text-xs"
                rows={18}
                spellCheck={false}
                dir="ltr"
                placeholder='{ "plans": [...], "foods": [...], "meals": [...] }'
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              {text.trim() && (
                <div>
                  {parsed.ok ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="badge badge-success">{t("import.jsonValid")}</span>
                      <span className="badge badge-ghost">
                        <bdi dir="ltr" className="tabular-nums">{counts?.plans ?? 0}</bdi>{" "}
                        {t("import.plansCount", { count: "" }).replace(/\s*\{\{count\}\}\s*/, " ").trim()}
                      </span>
                      <span className="badge badge-ghost">
                        <bdi dir="ltr" className="tabular-nums">{counts?.foods ?? 0}</bdi>{" "}
                        {t("import.foodsCount", { count: "" }).replace(/\s*\{\{count\}\}\s*/, " ").trim()}
                      </span>
                      <span className="badge badge-ghost">
                        <bdi dir="ltr" className="tabular-nums">{counts?.meals ?? 0}</bdi>{" "}
                        {t("import.mealsCount", { count: "" }).replace(/\s*\{\{count\}\}\s*/, " ").trim()}
                      </span>
                    </div>
                  ) : (
                    <div className="alert alert-error text-xs break-words" dir="ltr">
                      {parsed.error}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="alert alert-error text-sm break-words">{error}</div>}

              <div className="flex justify-end">
                <button
                  className="btn btn-primary"
                  disabled={!parsed.ok || !parsed.data || busy}
                  onClick={doImport}
                >
                  {busy ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    t("import.import")
                  )}
                </button>
              </div>
            </div>
          </div>

          {result && (
            <div className="card bg-base-200 border border-success/40">
              <div className="card-body p-4 min-w-0">
                <h3 className="font-bold text-success">{t("import.importComplete")}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  <Stat label={t("import.plansCreated")} value={result.plansCreated} />
                  <Stat label={t("import.plansSkipped")} value={result.plansSkipped} muted />
                  <Stat label={t("import.foodsCreated")} value={result.foodsCreated} />
                  <Stat label={t("import.foodsSkipped")} value={result.foodsSkipped} muted />
                  <Stat label={t("import.mealsCreated")} value={result.mealsCreated} />
                  <Stat label={t("import.mealsSkipped")} value={result.mealsSkipped} muted />
                </div>
                {result.errors.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm opacity-80">
                      <bdi dir="ltr" className="tabular-nums">{result.errors.length}</bdi>{" "}
                      {t("import.warnings", { count: "" }).replace(/\s*\{\{count\}\}\s*/, " ").trim()}
                    </summary>
                    <ul className="list-disc list-inside text-xs opacity-70 mt-2 space-y-1 break-words">
                      {result.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-3 min-w-0">
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-4 space-y-2 min-w-0">
              <h3 className="font-bold text-sm">{t("import.quickRules")}</h3>
              <ul className="text-xs opacity-70 space-y-1.5 list-disc list-inside break-words">
                <li>{t("import.ruleWeekday")}</li>
                <li>{t("import.ruleStartWeekday")}</li>
                <li>{t("import.ruleDeadline")}</li>
                <li>{t("import.ruleDurations")}</li>
                <li>{t("import.ruleSlugs")}</li>
                <li>{t("import.rulePlanSlug")}</li>
                <li>{t("import.ruleFoodSlug")}</li>
                <li>{t("import.ruleOneFood")}</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div
      className={`rounded-lg p-2 bg-base-100/60 border border-base-300 min-w-0 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="text-xl font-bold tabular-nums" dir="ltr">{value}</div>
      <div className="text-[11px] opacity-60 break-words">{label}</div>
    </div>
  );
}
