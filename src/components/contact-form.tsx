"use client";

import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      company: (form.elements.namedItem("company") as HTMLInputElement).value,
      role: (form.elements.namedItem("role") as HTMLInputElement).value,
      interest: (form.elements.namedItem("interest") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="mt-8 rounded-xl border border-[var(--accent)]/15 bg-[var(--accent-glow)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-glow)]">
          <svg className="h-6 w-6 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="font-sans text-lg font-semibold text-[var(--ink)]">Thank you!</h3>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          We&apos;ve received your message and will be in touch within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required placeholder="Your name" />
        <Field label="Email" name="email" type="email" required placeholder="you@company.com" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" name="company" required placeholder="Company name" />
        <Field label="Role" name="role" placeholder="e.g. COO, VP Operations" />
      </div>

      <div>
        <label className="mb-1.5 block font-sans text-xs font-medium text-[var(--ink-muted)]">
          What are you interested in?
        </label>
        <select
          name="interest"
          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 font-sans text-[13px] text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
          defaultValue=""
        >
          <option value="" disabled>Select an option</option>
          <option value="demo">Request a demo</option>
          <option value="pilot">Start a pilot engagement</option>
          <option value="enterprise">Enterprise implementation</option>
          <option value="partnership">Partnership inquiry</option>
          <option value="other">Something else</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block font-sans text-xs font-medium text-[var(--ink-muted)]">
          Message
        </label>
        <textarea
          name="message"
          rows={4}
          required
          placeholder="Tell us about your operations and what you're looking to improve..."
          className="w-full resize-none rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 font-sans text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
        />
      </div>

      {state === "error" && (
        <p className="text-[13px] text-[var(--red-soft)]">Something went wrong. Please try again or email us directly.</p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full rounded-[10px] bg-[var(--accent)] py-3 font-sans text-sm font-semibold text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] transition hover:bg-[var(--accent-dim)] disabled:opacity-50"
      >
        {state === "submitting" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-sans text-xs font-medium text-[var(--ink-muted)]">
        {label} {required && <span className="text-[var(--accent)]/50">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 font-sans text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
      />
    </div>
  );
}
