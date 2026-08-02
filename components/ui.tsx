import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

/*
 * The closed vocabulary (DESIGN.md): black text, white ground, 1px rule,
 * a frame for work, mono metadata. Every surface builds from these.
 * One primary button per screen. Secondary actions are mono text links.
 */

export function PrimaryButton(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`fact w-full bg-ink px-4 py-4 text-paper transition-opacity duration-150 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="fact-secondary mb-2 block">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[13px] text-secondary">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full border border-rule bg-transparent px-3 py-3 text-[15px] placeholder:lowercase placeholder:text-secondary focus:border-ink focus:outline-none ${className}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`min-h-28 w-full border border-rule bg-transparent px-3 py-3 text-[15px] placeholder:lowercase placeholder:text-secondary focus:border-ink focus:outline-none ${className}`}
    />
  );
}

export function Chip({
  active,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...rest}
      className={`fact border px-2 py-1.5 transition-opacity duration-150 ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-paper text-secondary hover:opacity-80"
      }`}
    >
      {children}
    </button>
  );
}

export function Rule() {
  return <hr className="border-0 border-t border-rule" />;
}

/* The letterbox frame a piece of work sits in before/without real video. */
export function WorkFrame({
  vertical,
  label,
}: {
  vertical?: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex w-full items-center justify-center bg-frame ${
        vertical ? "aspect-9/16" : "aspect-video"
      }`}
    >
      <span className="fact text-paper opacity-60">{label}</span>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-[13px] text-error">{children}</p>;
}
