"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { DISCIPLINES, LEVELS } from "@/lib/taxonomy";
import { join } from "./_actions";
import { ERROR_MESSAGES, type JoinState } from "./messages";

/*
 * The conversational join flow — one question per screen, humanised, like
 * texting with a person. State lives here in the client; the server action is
 * the source of truth and re-validates everything on final submit.
 *
 * Typography note (owner override, this product): monospace is retired here.
 * Sentences use the default body font (a serif, wired globally). Small labels
 * and facts are serif uppercase 12px with 0.08em tracking via inline classes —
 * no .fact / font-mono.
 */

// ---- steps ---------------------------------------------------------------

// Ordered ids. Level count (0 or 1) inserts the "how seasoned" step only when
// something is picked, so "3 / 8" reflects a real path.
type StepId =
  | "name"
  | "disciplines"
  | "levels"
  | "city"
  | "travel"
  | "contact"
  | "password"
  | "review";

// Which step a returned server error sends the person back to.
const ERROR_STEP: Record<string, StepId> = {
  missing: "name",
  password: "password",
  email: "contact",
  city: "city",
  disciplines: "disciplines",
  radius: "travel",
  dupe: "contact",
};

const LABEL = "font-serif uppercase tracking-[0.08em] text-[12px]";

// ---- small pieces --------------------------------------------------------

function Question({
  n,
  total,
  title,
  sub,
  children,
  onBack,
  onNext,
  nextLabel = "ok",
  canAdvance,
  error,
}: {
  n: number;
  total: number;
  title: string;
  sub?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  canAdvance: boolean;
  error?: string | null;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col px-6 py-8 sm:px-12">
      <div className="flex items-center justify-between">
        <Link href="/" className={`${LABEL} text-secondary`}>
          callsheet
        </Link>
        <span className={`${LABEL} text-secondary`}>
          {n} / {total}
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-12">
        <h1 className="headline text-[clamp(40px,7vw,72px)]">{title}</h1>
        {sub ? (
          <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-secondary">
            {sub}
          </p>
        ) : null}

        <div className="mt-10">{children}</div>

        {error ? (
          <p className="mt-6 text-[15px] leading-relaxed text-error">{error}</p>
        ) : null}

        <div className="mt-12 flex items-center gap-8">
          <button
            type="button"
            onClick={onNext}
            disabled={!canAdvance}
            className="bg-ink px-8 py-4 text-paper transition-opacity duration-150 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className={LABEL}>{nextLabel}</span>
          </button>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className={`${LABEL} text-secondary transition-opacity duration-150 hover:opacity-70`}
            >
              back
            </button>
          ) : null}
          <span className={`${LABEL} hidden text-secondary sm:inline`}>
            press enter
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- the flow ------------------------------------------------------------

export default function Flow() {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    join,
    { code: null },
  );

  // answers
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [city, setCity] = useState("");
  const [travel, setTravel] = useState<"yes" | "no" | null>(null);
  const [radius, setRadius] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // navigation
  const [step, setStep] = useState<StepId>("name");
  const [visible, setVisible] = useState(true); // opacity gate for 150ms fades

  // The live path. "levels" only exists once a craft is picked.
  const order: StepId[] = [
    "name",
    "disciplines",
    ...(picked.length > 0 ? (["levels"] as StepId[]) : []),
    "city",
    "travel",
    "contact",
    "password",
    "review",
  ];
  const total = order.length;
  const index = Math.max(0, order.indexOf(step));

  // When a server error comes back, jump to the step that owns it.
  useEffect(() => {
    if (state.code) {
      const target = ERROR_STEP[state.code] ?? "name";
      go(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.code]);

  function go(next: StepId) {
    if (next === step) return;
    setVisible(false);
    window.setTimeout(() => {
      setStep(next);
      setVisible(true);
    }, 150);
  }

  function advance() {
    const here = order.indexOf(step);
    const next = order[here + 1];
    if (next) go(next);
  }

  function back() {
    const here = order.indexOf(step);
    const prev = order[here - 1];
    if (prev) go(prev);
  }

  function submit() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("phone", phone);
    fd.set("city", city);
    fd.set("password", password);
    for (const d of picked) {
      fd.append("discipline", d);
      fd.set(`level_${d}`, levels[d] ?? "professional");
    }
    fd.set("travel", travel === "yes" ? "yes" : "no");
    if (travel === "yes" && radius.trim()) {
      fd.set("travelRadiusMiles", radius.trim());
    }
    startTransition(() => formAction(fd));
  }

  function toggleDiscipline(d: string) {
    setPicked((prev) => {
      if (prev.includes(d)) {
        setLevels((lv) => {
          const next = { ...lv };
          delete next[d];
          return next;
        });
        return prev.filter((x) => x !== d);
      }
      setLevels((lv) => ({ ...lv, [d]: lv[d] ?? "professional" }));
      return [...prev, d];
    });
  }

  const err = state.code ? ERROR_MESSAGES[state.code] ?? null : null;
  // Only show the error on the step that owns it, so a fixed field clears it.
  const errFor = (id: StepId) =>
    state.code && ERROR_STEP[state.code] === id ? err : null;

  function canAdvance(id: StepId): boolean {
    switch (id) {
      case "name":
        return name.trim().length > 0;
      case "disciplines":
        return picked.length > 0;
      case "levels":
        return picked.every((d) => LEVELS.some((l) => l.id === (levels[d] ?? "")));
      case "city":
        return city.trim().length > 0;
      case "travel":
        return travel !== null;
      case "contact":
        return (
          email.trim().length > 0 &&
          /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
        );
      case "password":
        return password.length >= 8;
      default:
        return true;
    }
  }

  // Enter advances (or submits on review) no matter what has focus — a chip, a
  // level button, or a text field. A document listener beats an element handler
  // here because a focused <button> would otherwise eat the key first. Text
  // inputs still get Enter naturally; we just also drive the flow from it.
  useEffect(() => {
    function onEnter(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      if (step === "review") {
        if (!pending) submit();
        return;
      }
      if (canAdvance(step)) advance();
    }
    document.addEventListener("keydown", onEnter);
    return () => document.removeEventListener("keydown", onEnter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    pending,
    name,
    picked,
    levels,
    city,
    travel,
    email,
    password,
  ]);

  const shell = (node: ReactNode) => (
    <main
      className="transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {node}
    </main>
  );

  // ---- per-step render ---------------------------------------------------

  if (step === "name") {
    return shell(
      <Question
        n={index + 1}
        total={total}
        title="what's your name?"
        sub="however you want it on a callsheet."
        onNext={advance}
        canAdvance={canAdvance("name")}
        error={errFor("name")}
      >
        <AutoInput
          value={name}
          onChange={setName}
          placeholder="your name"
          autoComplete="name"
        />
      </Question>,
    );
  }

  if (step === "disciplines") {
    return shell(
      <Question
        n={index + 1}
        total={total}
        title="what do you make?"
        sub="pick every craft you work in. you can choose more than one."
        onBack={back}
        onNext={advance}
        canAdvance={canAdvance("disciplines")}
        error={errFor("disciplines")}
      >
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map((d) => {
            const on = picked.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDiscipline(d)}
                className={`border px-3 py-2 transition-opacity duration-150 ${LABEL} ${
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-paper text-secondary hover:opacity-70"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Question>,
    );
  }

  if (step === "levels") {
    return shell(
      <Question
        n={index + 1}
        total={total}
        title="how seasoned are you?"
        sub={
          picked.length > 1
            ? "set the level that fits each craft."
            : "set the level that fits."
        }
        onBack={back}
        onNext={advance}
        canAdvance={canAdvance("levels")}
      >
        <div className="flex flex-col gap-8">
          {picked.map((d) => (
            <div key={d}>
              <p className={`${LABEL} mb-3`}>{d}</p>
              <div className="flex flex-col divide-y divide-rule border-t border-b border-rule">
                {LEVELS.map((l) => {
                  const on = (levels[d] ?? "professional") === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() =>
                        setLevels((lv) => ({ ...lv, [d]: l.id }))
                      }
                      className="flex items-baseline justify-between gap-4 py-3 text-left transition-opacity duration-150 hover:opacity-70"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className={`${LABEL} w-4 text-secondary`}>
                          {on ? "x" : ""}
                        </span>
                        <span className="text-[18px]">{l.label}</span>
                      </span>
                      <span className="max-w-xs text-[13px] leading-snug text-secondary">
                        {l.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Question>,
    );
  }

  if (step === "city") {
    return shell(
      <Question
        n={index + 1}
        total={total}
        title="where are you based?"
        sub="san diego area is where the work starts."
        onBack={back}
        onNext={advance}
        canAdvance={canAdvance("city")}
        error={errFor("city")}
      >
        <AutoInput
          value={city}
          onChange={setCity}
          placeholder="san diego"
          autoComplete="address-level2"
        />
      </Question>,
    );
  }

  if (step === "travel") {
    return shell(
      <Question
        n={index + 1}
        total={total}
        title="would you travel for the right job?"
        onBack={back}
        onNext={advance}
        canAdvance={canAdvance("travel")}
        error={errFor("travel")}
      >
        <div className="flex flex-col gap-8">
          <div className="flex gap-2">
            {(["yes", "no"] as const).map((v) => {
              const on = travel === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTravel(v)}
                  className={`border px-6 py-3 transition-opacity duration-150 ${LABEL} ${
                    on
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-paper text-secondary hover:opacity-70"
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
          {travel === "yes" ? (
            <div>
              <p className={`${LABEL} mb-2 text-secondary`}>
                how far, in miles? optional
              </p>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="e.g. 50"
                className="w-40 border-0 border-b border-rule bg-transparent pb-2 text-[20px] placeholder:text-secondary focus:border-ink focus:outline-none"
              />
            </div>
          ) : null}
        </div>
      </Question>,
    );
  }

  if (step === "contact") {
    return shell(
      <Question
        n={index + 1}
        total={total}
        title="how do we reach you?"
        sub="a person reads every request. no spam."
        onBack={back}
        onNext={advance}
        canAdvance={canAdvance("contact")}
        error={errFor("contact")}
      >
        <div className="flex flex-col gap-8">
          <div>
            <p className={`${LABEL} mb-2 text-secondary`}>email</p>
            <AutoInput
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              focus
            />
          </div>
          <div>
            <p className={`${LABEL} mb-2 text-secondary`}>phone · optional</p>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="619 555 0100"
              className="w-full border-0 border-b border-rule bg-transparent pb-3 text-[24px] leading-tight placeholder:text-secondary focus:border-ink focus:outline-none"
            />
          </div>
        </div>
      </Question>,
    );
  }

  if (step === "password") {
    return shell(
      <Question
        n={index + 1}
        total={total}
        title="pick a password."
        sub="so this profile stays yours. at least 8 characters."
        onBack={back}
        onNext={advance}
        canAdvance={canAdvance("password")}
        error={errFor("password")}
      >
        <AutoInput
          value={password}
          onChange={setPassword}
          placeholder="set a password"
          type="password"
          autoComplete="new-password"
        />
      </Question>,
    );
  }

  // review
  const craftLine =
    picked.length === 0
      ? ""
      : picked.length === 1
        ? picked[0]
        : picked.length === 2
          ? `${picked[0]} and ${picked[1]}`
          : `${picked.slice(0, -1).join(", ")}, and ${picked[picked.length - 1]}`;

  const rows: { label: string; value: string; target: StepId }[] = [
    { label: "name", value: name || "—", target: "name" },
    { label: "crafts", value: craftLine || "—", target: "disciplines" },
    { label: "based in", value: city || "—", target: "city" },
    {
      label: "travel",
      value:
        travel === "yes"
          ? radius.trim()
            ? `yes, up to ${radius.trim()} miles`
            : "yes"
          : travel === "no"
            ? "no"
            : "—",
      target: "travel",
    },
    { label: "email", value: email || "—", target: "contact" },
  ];

  return shell(
    <div className="flex min-h-dvh w-full flex-col px-6 py-8 sm:px-12">
      <div className="flex items-center justify-between">
        <Link href="/" className={`${LABEL} text-secondary`}>
          callsheet
        </Link>
        <span className={`${LABEL} text-secondary`}>
          {index + 1} / {total}
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-12">
        <h1 className="headline text-[clamp(40px,7vw,72px)]">
          {name ? `here's you, ${name.split(" ")[0]}.` : "here's you."}
        </h1>
        <p className="mt-5 text-[18px] leading-relaxed text-secondary">
          read it back. anything off, jump in and fix it.
        </p>

        <div className="mt-10 flex flex-col divide-y divide-rule border-t border-b border-rule">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-baseline justify-between gap-4 py-4"
            >
              <span className={`${LABEL} w-28 shrink-0 text-secondary`}>
                {r.label}
              </span>
              <span className="flex-1 text-[18px] leading-snug">{r.value}</span>
              <button
                type="button"
                onClick={() => go(r.target)}
                className={`${LABEL} text-secondary transition-opacity duration-150 hover:opacity-70`}
              >
                edit
              </button>
            </div>
          ))}
        </div>

        {err ? (
          <p className="mt-6 text-[15px] leading-relaxed text-error">{err}</p>
        ) : null}

        <div className="mt-12 flex items-center gap-8">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="bg-ink px-8 py-4 text-paper transition-opacity duration-150 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className={LABEL}>
              {pending ? "getting you on..." : "get on the callsheet"}
            </span>
          </button>
          <button
            type="button"
            onClick={back}
            className={`${LABEL} text-secondary transition-opacity duration-150 hover:opacity-70`}
          >
            back
          </button>
        </div>

        <p className="mt-10 text-[15px] text-secondary">
          already have an account?{" "}
          <Link className="text-ink underline underline-offset-4" href="/login">
            log in
          </Link>
          .
        </p>
      </div>
    </div>,
  );
}

// Focuses itself on mount so each question lands with the cursor ready.
function AutoInput({
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  focus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  focus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  return (
    <input
      ref={ref}
      type={type}
      autoComplete={autoComplete}
      value={value}
      onChange={(e: FormEvent<HTMLInputElement>) =>
        onChange(e.currentTarget.value)
      }
      placeholder={placeholder}
      className="w-full border-0 border-b border-rule bg-transparent pb-3 text-[24px] leading-tight placeholder:text-secondary focus:border-ink focus:outline-none"
    />
  );
}
