"use client";

import { useState } from "react";
import { createProject, updateProject } from "@/modules/marketplace/actions";
import { CATEGORIES } from "@/modules/marketplace/categories";
import { Button } from "@/modules/ui/Button";

type ExistingProject = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budgetType: "fixed" | "milestone" | "hourly";
  budgetMin: string | null;
  budgetMax: string | null;
  timelineDays: number | null;
  visibility: "public" | "invite_only";
  companyId: string | null;
  skillNames: string[];
};

// Reused for both /projects/new (createProject) and /projects/[id]/edit
// (updateProject, bound to the id) — design language G-1: a draft used to
// have no way back to this form once saved.
export function CreateProjectForm({
  companies = [],
  existing,
}: {
  companies?: { id: string; name: string }[];
  existing?: ExistingProject;
}) {
  const [skillInput, setSkillInput] = useState("");
  const [skillNames, setSkillNames] = useState<string[]>(existing?.skillNames ?? []);
  const [budgetType, setBudgetType] = useState<"fixed" | "milestone" | "hourly">(
    existing?.budgetType ?? "fixed"
  );
  const [pending, setPending] = useState(false);
  const action = existing ? updateProject.bind(null, existing.id) : createProject;

  function addSkill() {
    const name = skillInput.trim();
    if (name && !skillNames.includes(name)) {
      setSkillNames([...skillNames, name]);
    }
    setSkillInput("");
  }

  function removeSkill(name: string) {
    setSkillNames(skillNames.filter((s) => s !== name));
  }

  return (
    <form
      action={action}
      onSubmit={() => setPending(true)}
      className="space-y-6"
    >
      {companies.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium">Post as</label>
          <select
            name="companyId"
            className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2"
            defaultValue={existing?.companyId ?? ""}
          >
            <option value="">Myself</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          name="title"
          required
          minLength={3}
          maxLength={200}
          defaultValue={existing?.title}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="e.g. Build a Stripe Connect payout flow"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          name="description"
          required
          minLength={20}
          rows={6}
          defaultValue={existing?.description}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="What needs to be built, and any context a developer would need to scope it accurately."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Category</label>
        <select
          name="category"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          defaultValue={existing?.category ?? ""}
        >
          <option value="" disabled>
            Choose a category
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Required skills</label>
        <div className="flex gap-2">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addSkill();
              }
            }}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            placeholder="Type a skill and press Enter"
          />
          <button
            type="button"
            onClick={addSkill}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Add
          </button>
        </div>
        {skillNames.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {skillNames.map((name) => (
              <li
                key={name}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
              >
                {name}
                <input type="hidden" name="skillNames" value={name} />
                <button
                  type="button"
                  onClick={() => removeSkill(name)}
                  aria-label={`Remove ${name}`}
                  className="text-brand-400 hover:text-brand-700"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Budget type</label>
        <div className="flex gap-4 text-sm">
          {(["fixed", "milestone", "hourly"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="radio"
                name="budgetType"
                value={type}
                checked={budgetType === type}
                onChange={() => setBudgetType(type)}
              />
              {type === "fixed" ? "Fixed price" : type === "milestone" ? "Milestone-based" : "Hourly"}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {budgetType === "hourly" ? "Min rate ($/hr)" : "Budget min ($)"}
          </label>
          <input
            name="budgetMin"
            type="number"
            min={0}
            step="0.01"
            defaultValue={existing?.budgetMin ?? undefined}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {budgetType === "hourly" ? "Max rate ($/hr)" : "Budget max ($)"}
          </label>
          <input
            name="budgetMax"
            type="number"
            min={0}
            step="0.01"
            defaultValue={existing?.budgetMax ?? undefined}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Timeline (days)</label>
        <input
          name="timelineDays"
          type="number"
          min={1}
          defaultValue={existing?.timelineDays ?? undefined}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Visibility</label>
        <select
          name="visibility"
          defaultValue={existing?.visibility ?? "public"}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2"
        >
          <option value="public">Public — anyone can browse and propose</option>
          <option value="invite_only">Invite only — visible to invited developers only</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Attachments</label>
        <input
          name="attachments"
          type="file"
          multiple
          className="w-full text-sm"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" name="intent" value="draft" disabled={pending} variant="secondary">
          Save as draft
        </Button>
        <Button type="submit" name="intent" value="publish" disabled={pending}>
          Publish
        </Button>
      </div>
    </form>
  );
}
