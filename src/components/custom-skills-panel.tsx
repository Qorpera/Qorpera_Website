"use client";

import { useState, useCallback } from "react";
import { CustomSkillEditor } from "./custom-skill-editor";

type SkillSummary = {
  id: string;
  name: string;
  displayName: string;
  shortDescription: string;
  category: string;
  enabled: boolean;
  isPublished: boolean;
  validationStatus: string;
  version: number;
};

export function CustomSkillsPanel({ initialSkills }: { initialSkills: SkillSummary[] }) {
  const [skills, setSkills] = useState(initialSkills);
  const [editing, setEditing] = useState<string | null>(null); // skill id or "new"
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/custom-skills");
    if (res.ok) {
      const data = await res.json();
      setSkills(data.skills);
    }
  }, []);

  const handleCreate = async (data: Record<string, unknown>) => {
    await fetch("/api/custom-skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: String(data.displayName).toLowerCase().replace(/\s+/g, "-"), ...data }),
    });
    setEditing(null);
    await refresh();
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editing || editing === "new") return;
    await fetch(`/api/custom-skills/${editing}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditing(null);
    await refresh();
  };

  const toggleSkill = async (id: string, enabled: boolean) => {
    await fetch(`/api/custom-skills/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await refresh();
  };

  const deleteSkill = async (id: string) => {
    await fetch(`/api/custom-skills/${id}`, { method: "DELETE" });
    await refresh();
  };

  const startEdit = async (id: string) => {
    const res = await fetch(`/api/custom-skills/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEditData(data.skill);
      setEditing(id);
    }
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">{editing === "new" ? "Create Skill" : "Edit Skill"}</h2>
        <CustomSkillEditor
          skill={editing !== "new" ? (editData as never) : undefined}
          onSave={editing === "new" ? handleCreate : handleUpdate}
          onCancel={() => { setEditing(null); setEditData(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Custom Skills</h2>
        <button
          onClick={() => setEditing("new")}
          className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-500"
        >
          Create Skill
        </button>
      </div>

      {skills.length === 0 ? (
        <p className="text-sm text-gray-500">No custom skills yet. Create one to extend your agents&apos; capabilities.</p>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div key={skill.id} className={`rounded-lg border p-3 ${skill.enabled ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-white truncate">{skill.displayName}</span>
                  <span className="rounded bg-gray-800 px-1 py-0.5 text-[10px] text-gray-500">{skill.category}</span>
                  <span className={`text-[10px] ${skill.validationStatus === "VALID" ? "text-emerald-400" : "text-amber-400"}`}>
                    {skill.validationStatus === "VALID" ? "Valid" : "Needs fix"}
                  </span>
                  <span className="text-[10px] text-gray-600">v{skill.version}</span>
                  {skill.isPublished && <span className="text-[10px] text-teal-400">Published</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleSkill(skill.id, !skill.enabled)} className={`rounded px-2 py-0.5 text-xs ${skill.enabled ? "bg-emerald-900/40 text-emerald-400" : "bg-gray-800 text-gray-500"}`}>
                    {skill.enabled ? "On" : "Off"}
                  </button>
                  <button onClick={() => startEdit(skill.id)} className="rounded px-2 py-0.5 text-xs text-gray-400 hover:bg-white/10">Edit</button>
                  <button onClick={() => deleteSkill(skill.id)} className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-900/30">Delete</button>
                </div>
              </div>
              {skill.shortDescription && <p className="text-xs text-gray-500 mt-1">{skill.shortDescription}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
