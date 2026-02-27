"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), goal: goal.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { slug } = await res.json();
      router.push(`/projects/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-white/40 hover:text-white/70">← Projects</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">New project</h1>
        <p className="mt-1 text-sm text-white/50">A project groups agent tasks under a shared goal.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Project name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q2 Marketing Push"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Goal <span className="text-white/30 font-normal">(optional)</span></label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What does success look like?"
            rows={3}
            className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
          />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving || !name.trim()} className="wf-btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
            {saving ? "Creating…" : "Create project"}
          </button>
          <Link href="/projects" className="wf-btn px-5 py-2.5 text-sm">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
