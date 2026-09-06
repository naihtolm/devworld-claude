// Guided-tour content. Each step's `target` matches a `data-tour="..."`
// attribute on the real page (CreateProjectForm.tsx / SubmitProposalForm.tsx)
// — the overlay (TourProvider.tsx) spotlights that live element rather than
// a screenshot, so the tour never drifts out of sync with the actual form.

export type TourStep = {
  target: string;
  title: string;
  body: string;
  placement?: "top" | "bottom";
};

export type TourDefinition = {
  id: string;
  steps: TourStep[];
};

export const TOURS = {
  "post-a-project": {
    id: "post-a-project",
    steps: [
      {
        target: "project-title",
        title: "Give it a clear title",
        body: "Specific titles get better proposals — mention the core technology or outcome if you can.",
      },
      {
        target: "project-description",
        title: "Describe the work",
        body: "The more context a developer has, the more accurate — and useful — their proposal will be.",
      },
      {
        target: "project-category",
        title: "Pick a category",
        body: "This is how developers filter and find your project. Pick the closest match.",
      },
      {
        target: "project-budget-type",
        title: "Choose how you'll pay",
        body: "Fixed price for a defined deliverable, milestones for larger phased work, hourly for ongoing or exploratory work.",
      },
      {
        target: "project-budget-range",
        title: "Set a budget range",
        body: "A realistic range attracts serious proposals — you're not charged anything until you fund a milestone.",
      },
      {
        target: "project-publish",
        title: "Publish when ready",
        body: "Save as a draft to keep editing later, or publish now to start receiving proposals right away.",
        placement: "top",
      },
    ],
  },
  "submit-a-proposal": {
    id: "submit-a-proposal",
    steps: [
      {
        target: "proposal-introduction",
        title: "Introduce your approach",
        body: "Reference something specific from the brief — clients can tell a templated pitch from a considered one.",
      },
      {
        target: "proposal-rate-type",
        title: "Match or propose a rate type",
        body: "You can propose a different rate type than the client listed, if it fits the work better.",
      },
      {
        target: "proposal-amount",
        title: "Set your amount",
        body: "Price to the scope as described — if it's underspecified, say so in your introduction rather than guessing.",
      },
      {
        target: "proposal-timeline",
        title: "Estimate a timeline",
        body: "Optional, but a concrete estimate reads as more credible than none at all.",
      },
      {
        target: "proposal-submit",
        title: "Submit when ready",
        body: "You can only submit one proposal per project, so make sure it's ready before sending.",
        placement: "top",
      },
    ],
  },
} as const satisfies Record<string, TourDefinition>;

export type TourId = keyof typeof TOURS;
