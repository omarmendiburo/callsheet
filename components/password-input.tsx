"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { InputHTMLAttributes } from "react";

/*
 * Password field with a reveal toggle (the eye). Lucide is the one
 * approved icon set. The button never submits the form.
 */
export function PasswordInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">,
) {
  const { className = "", ...rest } = props;
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className={`w-full border border-rule bg-transparent px-3 py-3 pr-11 text-[15px] placeholder:lowercase placeholder:text-secondary focus:border-ink focus:outline-none ${className}`}
      />
      <button
        type="button"
        aria-label={visible ? "hide password" : "show password"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-secondary transition-opacity duration-150 hover:opacity-70"
      >
        {visible ? (
          <EyeOff size={18} strokeWidth={1.5} />
        ) : (
          <Eye size={18} strokeWidth={1.5} />
        )}
      </button>
    </span>
  );
}
