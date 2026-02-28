"use client";

import { useState } from "react";

type Props = {
  skill?: {
    id: string;
    name: string;
    displayName: string;
    shortDescription: string;
    category: string;
    skillMdContent: string;
    validationStatus: string;
    validationErrors: string | null;
  };
  onSave: (data: { displayName: string; shortDescription: string; category: string; skillMdContent: string }) => Promise<void>;
  onCancel: () => void;
};

const SKILL_TEMPLATE = `---
name: my-skill
description: A custom skill
author: me
---

# My Custom Skill

## Instructions

1. Step one
2. Step two
3. Step three

## Notes

- Add any context or examples here
`;

export function CustomSkillEditor({ skill, onSave, onCancel }: Props) {
  const [displayName, setDisplayName] = useState(skill?.displayName ?? "");
  const [shortDescription, setShortDescription] = useState(skill?.shortDescription ?? "");
  const [category, setCategory] = useState(skill?.category ?? "general");
  const [content, setContent] = useState(skill?.skillMdContent ?? SKILL_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ displayName, shortDescription, category, skillMdContent: content });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!skill?.id) return;
    setTesting(true);
    try {
      const res = await fetch(`/api/custom-skills/${skill.id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(data.result);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-400">Display Name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 block w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-sm text-white"
            placeholder="My Custom Skill"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-400">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-sm text-white"
          >
            <option value="general">General</option>
            <option value="sales">Sales</option>
            <option value="marketing">Marketing</option>
            <option value="operations">Operations</option>
            <option value="finance">Finance</option>
            <option value="research">Research</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-gray-400">Description</span>
        <input
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          className="mt-1 block w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-sm text-white"
          placeholder="A brief description of what this skill does"
        />
      </label>

      <div>
        <span className="text-xs text-gray-400">Skill Content (Markdown)</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="mt-1 block w-full rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-white font-mono"
          placeholder="Write your skill instructions in Markdown..."
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-600">{content.length.toLocaleString()} chars</span>
          {skill?.validationStatus && (
            <span className={`text-[10px] ${skill.validationStatus === "VALID" ? "text-emerald-400" : "text-amber-400"}`}>
              {skill.validationStatus}
              {skill.validationErrors && `: ${skill.validationErrors}`}
            </span>
          )}
        </div>
      </div>

      {testResult && (
        <div className="rounded bg-white/5 border border-white/10 px-3 py-2 text-xs text-gray-300">
          Test result: {testResult}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="rounded bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500 disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
        {skill?.id && (
          <button onClick={handleTest} disabled={testing} className="rounded bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50">
            {testing ? "Testing..." : "Test"}
          </button>
        )}
        <button onClick={onCancel} className="rounded bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10">
          Cancel
        </button>
      </div>
    </div>
  );
}
