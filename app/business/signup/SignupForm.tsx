"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { PasswordInput } from "@/components/password-input";
import { WORK_TYPES } from "@/lib/taxonomy";
import { ErrorText, Field, PrimaryButton, TextInput } from "@/components/ui";
import { signup, type SignupState } from "./_actions";

/*
 * Client form so a failed validation returns state instead of navigating:
 * every filled field (and every checked work-type chip) survives its own
 * error. The submit is intercepted and the action invoked manually because
 * React 19 auto-resets a form after an action-prop submission, which is the
 * exact field wipe this exists to prevent (owner's bug report 2026-08-02).
 * In-flight feedback on the submit per the /join pattern.
 */

const ERRORS: Record<string, string> = {
  missing: "business name, your name, email, and a password are all required.",
  ein: "the ein must be nine digits (with or without a dash).",
  worktypes: "pick at least one type of work.",
  city: "which city does the organization work out of?",
  password: "password must be at least 8 characters.",
  email: "that email address doesn't look right.",
  website: "the website must start with http:// or https://.",
  dupe: "an account with that email already exists.",
  agree: "please confirm you read the terms and the data notice.",
};

export function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(
    signup,
    { code: null },
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="mt-12 flex flex-col gap-8"
    >
      <fieldset className="flex flex-col gap-8">
        <legend className="fact-secondary mb-1">the organization</legend>

        <Field label="business name">
          <TextInput
            name="orgName"
            placeholder="e.g. harbor light fund"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <Field label="ein" hint="nine digits, dash optional">
            <TextInput name="ein" placeholder="12-3456789" required />
          </Field>
          <Field label="website" hint="optional">
            <TextInput name="website" type="url" placeholder="https://" />
          </Field>
        </div>

        <fieldset>
          <legend className="fact-secondary mb-3">
            types of work · pick everything that fits
          </legend>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPES.map((w) => (
              <label key={w} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="workType"
                  value={w}
                  className="peer sr-only"
                />
                <span className="fact block border border-rule bg-paper px-2 py-1.5 text-secondary transition-opacity duration-150 hover:opacity-80 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                  {w}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <Field label="street address" hint="optional">
            <TextInput
              name="address"
              autoComplete="street-address"
              placeholder="e.g. 100 harbor dr"
            />
          </Field>
          <Field label="city or zip">
            <TextInput
              name="city"
              autoComplete="postal-code"
              placeholder="92101"
              required
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-8">
        <legend className="fact-secondary mb-1">your account · the owner</legend>

        <Field label="full name">
          <TextInput
            name="name"
            autoComplete="name"
            placeholder="your name"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <Field label="email">
            <TextInput
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field label="phone" hint="optional">
            <TextInput
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="619 555 0100"
            />
          </Field>
        </div>

        <Field label="password" hint="8 characters or more">
          <PasswordInput
            name="password"
            autoComplete="new-password"
            placeholder="set a password"
            required
          />
        </Field>
      </fieldset>

      {state.code ? (
        <ErrorText>{ERRORS[state.code] ?? "something went wrong."}</ErrorText>
      ) : null}

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="agree"
          required
          className="mt-0.5 h-4 w-4 accent-ink"
        />
        <span className="text-[13px] leading-relaxed text-secondary">
          I read and agree to the{" "}
          <Link
            className="text-ink underline underline-offset-4"
            href="/terms"
            target="_blank"
          >
            terms of use
          </Link>{" "}
          and{" "}
          <Link
            className="text-ink underline underline-offset-4"
            href="/privacy"
            target="_blank"
          >
            how callsheet handles your data
          </Link>
          .
        </span>
      </label>

      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "CREATING..." : "CREATE THE ORGANIZATION"}
      </PrimaryButton>
    </form>
  );
}
