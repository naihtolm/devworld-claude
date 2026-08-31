"use client";

import { useState } from "react";
import { addPortfolioItem } from "@/modules/profiles/actions";
import { Button } from "@/modules/ui/Button";

export function AddPortfolioItemForm() {
  const [techInput, setTechInput] = useState("");
  const [technologies, setTechnologies] = useState<string[]>([]);

  function addTech() {
    const name = techInput.trim();
    if (name && !technologies.includes(name)) {
      setTechnologies([...technologies, name]);
    }
    setTechInput("");
  }

  return (
    <form
      action={addPortfolioItem}
      onSubmit={() => setTimeout(() => setTechnologies([]), 0)}
      className="space-y-3 rounded-md border border-dashed p-4"
    >
      <input name="title" required placeholder="Project title" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      <textarea name="description" placeholder="Description (optional)" rows={2} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      <input name="role" placeholder="Your role (optional)" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <input
          value={techInput}
          onChange={(e) => setTechInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTech();
            }
          }}
          placeholder="Technology, press Enter"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <Button type="button" onClick={addTech} variant="secondary" size="sm">
          Add
        </Button>
      </div>
      {technologies.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {technologies.map((t) => (
            <li key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
              {t}
              <input type="hidden" name="technologies" value={t} />
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input name="repoUrl" placeholder="Repo URL (optional)" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        <input name="externalUrl" placeholder="Live URL (optional)" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <Button type="submit" variant="secondary" size="sm">
        Add portfolio item
      </Button>
    </form>
  );
}
