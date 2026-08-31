"use client";

import { useState } from "react";
import { updateDeveloperProfile } from "@/modules/profiles/actions";
import { Button } from "@/modules/ui/Button";
import type { developerProfiles } from "@/db/schema";

type Profile = typeof developerProfiles.$inferSelect;

export function DeveloperProfileForm({
  profile,
  skillNames: initialSkillNames,
}: {
  profile: Profile | undefined;
  skillNames: string[];
}) {
  const [skillInput, setSkillInput] = useState("");
  const [skillNames, setSkillNames] = useState<string[]>(initialSkillNames);
  const [pending, setPending] = useState(false);

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
    <form action={updateDeveloperProfile} onSubmit={() => setPending(true)} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium">Headline</label>
        <input
          name="headline"
          defaultValue={profile?.headline ?? ""}
          maxLength={150}
          placeholder="e.g. Full-stack engineer, React & Node"
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Bio</label>
        <textarea
          name="bio"
          defaultValue={profile?.bio ?? ""}
          rows={5}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Location</label>
          <input
            name="location"
            defaultValue={profile?.location ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Timezone</label>
          <input
            name="timezone"
            defaultValue={profile?.timezone ?? ""}
            placeholder="e.g. America/New_York"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Years experience</label>
          <input
            name="yearsExperience"
            type="number"
            min={0}
            defaultValue={profile?.yearsExperience ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Hourly rate ($)</label>
          <input
            name="hourlyRate"
            type="number"
            min={0}
            step="0.01"
            defaultValue={profile?.hourlyRate ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Project starting price ($)</label>
          <input
            name="projectStartingPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={profile?.projectStartingPrice ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Availability</label>
        <select
          name="availability"
          defaultValue={profile?.availability ?? "available"}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2"
        >
          <option value="available">Available</option>
          <option value="limited">Limited</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Skills</label>
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
          <button type="button" onClick={addSkill} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
            Add
          </button>
        </div>
        {skillNames.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {skillNames.map((name) => (
              <li key={name} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">GitHub username</label>
          <input
            name="githubUsername"
            defaultValue={profile?.githubUsername ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">GitLab username</label>
          <input
            name="gitlabUsername"
            defaultValue={profile?.gitlabUsername ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">LinkedIn URL</label>
          <input
            name="linkedinUrl"
            defaultValue={profile?.linkedinUrl ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Website</label>
          <input
            name="websiteUrl"
            defaultValue={profile?.websiteUrl ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        Save profile
      </Button>
    </form>
  );
}
