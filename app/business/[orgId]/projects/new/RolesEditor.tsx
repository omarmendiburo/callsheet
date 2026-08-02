"use client";

import { useState } from "react";
import { DISCIPLINES, LEVELS } from "@/lib/taxonomy";

/*
 * Per-role terms editor (owner's call 2026-08-01): every role carries its
 * own rate, gear, and remote terms — a remote editor and an on-set DP can
 * live on one project. Starts at three rows; "add another role" grows it.
 * The rows serialize into one hidden JSON field; the server action re-parses
 * and re-validates everything — this component is convenience, not trust.
 */

export type RoleRow = {
  discipline: string;
  count: string;
  level: string;
  dayRate: string;
  hourlyPost: string;
  byoGear: string;
  remote: boolean;
};

const BLANK: RoleRow = {
  discipline: "",
  count: "1",
  level: "",
  dayRate: "",
  hourlyPost: "",
  byoGear: "not_needed",
  remote: false,
};

const selectCls =
  "fact-secondary w-full border border-rule bg-transparent px-2 py-2 focus:border-ink focus:outline-none";
const inputCls =
  "w-full border border-rule bg-transparent px-2 py-2 text-[15px] placeholder:lowercase placeholder:text-secondary focus:border-ink focus:outline-none";

export function RolesEditor() {
  const [rows, setRows] = useState<RoleRow[]>([BLANK, BLANK, BLANK]);

  const set = (i: number, patch: Partial<RoleRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const serialized = JSON.stringify(
    rows
      .filter((r) => r.discipline)
      .map((r) => ({
        discipline: r.discipline,
        count: Number.parseInt(r.count, 10) || 1,
        level: r.level || undefined,
        dayRate: r.dayRate ? Number.parseInt(r.dayRate, 10) : undefined,
        hourlyPost: r.hourlyPost
          ? Number.parseInt(r.hourlyPost, 10)
          : undefined,
        byoGear: r.byoGear,
        remote: r.remote,
      })),
  );

  return (
    <fieldset>
      <legend className="fact-secondary mb-3">
        roles needed · each role carries its own rate, gear, and remote terms
      </legend>
      <input type="hidden" name="rolesJson" value={serialized} />

      <div className="flex flex-col divide-y divide-rule border-t border-b border-rule">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-3 py-4">
            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
              <select
                aria-label="discipline"
                value={row.discipline}
                onChange={(e) => set(i, { discipline: e.target.value })}
                className={selectCls}
              >
                <option value="">— DISCIPLINE —</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d.toUpperCase()}
                  </option>
                ))}
              </select>
              <input
                aria-label="how many"
                type="number"
                min={1}
                max={99}
                value={row.count}
                onChange={(e) => set(i, { count: e.target.value })}
                placeholder="count"
                className={inputCls}
              />
              <select
                aria-label="experience level"
                value={row.level}
                onChange={(e) => set(i, { level: e.target.value })}
                className={selectCls}
              >
                <option value="">ANY LEVEL</option>
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
              <input
                aria-label="day rate on set (usd)"
                type="number"
                min={0}
                value={row.dayRate}
                onChange={(e) => set(i, { dayRate: e.target.value })}
                placeholder="$/day on set"
                className={inputCls}
              />
              <input
                aria-label="hourly post (usd)"
                type="number"
                min={0}
                value={row.hourlyPost}
                onChange={(e) => set(i, { hourlyPost: e.target.value })}
                placeholder="$/hr post"
                className={inputCls}
              />
              <select
                aria-label="bring your own gear"
                value={row.byoGear}
                onChange={(e) => set(i, { byoGear: e.target.value })}
                className={selectCls}
              >
                <option value="not_needed">GEAR PROVIDED</option>
                <option value="preferred">OWN GEAR PREFERRED</option>
                <option value="required">OWN GEAR REQUIRED</option>
              </select>
              <label className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  checked={row.remote}
                  onChange={(e) => set(i, { remote: e.target.checked })}
                  className="h-4 w-4 accent-ink"
                />
                <span className="fact-secondary">remote ok</span>
              </label>
            </div>

            {rows.length > 1 ? (
              <p>
                <button
                  type="button"
                  onClick={() =>
                    setRows((rs) => rs.filter((_, j) => j !== i))
                  }
                  className="fact-secondary underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
                >
                  remove this role
                </button>
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, BLANK])}
          className="fact underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
        >
          add another role
        </button>
        <p className="text-[13px] text-secondary">
          Only rows with a discipline are saved.
        </p>
      </div>
    </fieldset>
  );
}
