import type { TomWheelData } from "./types";

/**
 * Initial TOM configuration: a generic, fictional seven-component Target
 * Operating Model. The prototype opens with this until the user edits it;
 * "Reset to default" returns to it.
 */
export const DEFAULT_TOM: TomWheelData = {
  version: 1,
  title: "Target Operating Model\nfor IT Quality",
  subtitle: "",
  centerIcon: "tomMonitor",
  components: [
    {
      id: "strategy",
      name: "Strategy & Direction",
      icon: "compass",
      description:
        "Translates organisational ambition into clear priorities, measurable outcomes and the principles that guide every design choice in the operating model.",
      details:
        "Sets the 'why' for every other component: what the function must achieve, for whom, and how success will be judged over the planning horizon.",
      facts: [
        { label: "Accountable", value: "Executive leadership" },
        { label: "Cadence", value: "Annual, reviewed quarterly" },
      ],
      checklist: [
        "Mission, vision and value proposition for the function",
        "Strategic objectives with target outcomes",
        "Design principles that steer trade-offs",
        "Roadmap linking initiatives to objectives",
      ],
    },
    {
      id: "organization",
      name: "Organization & Roles",
      icon: "orgChart",
      description:
        "Defines how the function is structured, who is accountable for what, and how teams coordinate to deliver the strategy.",
      details:
        "Covers both the formal structure and the working relationships between teams, so that accountabilities are clear and nothing falls between the gaps.",
      facts: [
        { label: "Accountable", value: "Function head" },
        { label: "Key artefact", value: "Organisation chart & role profiles" },
      ],
      checklist: [
        "Structure, reporting lines and spans of control",
        "Role purposes and core responsibilities",
        "RACI for cross-team activities",
        "Sizing and sourcing approach",
      ],
    },
    {
      id: "processes",
      name: "Processes & Workflows",
      icon: "workflow",
      description:
        "Describes the end-to-end activities that create value, with clear hand-offs, checkpoints, inputs and outputs.",
      details:
        "Processes are documented at the level needed to run them consistently, and owned by named process owners who keep them current.",
      facts: [
        { label: "Accountable", value: "Process owners" },
        { label: "Key artefact", value: "Process architecture (L1–L3)" },
      ],
      checklist: [
        "Process architecture and levels",
        "Hand-offs, checkpoints and service levels",
        "Standard procedures, templates and tools",
        "Continuous improvement of process performance",
      ],
    },
    {
      id: "governance",
      name: "Governance & Decisions",
      icon: "balance",
      description:
        "Sets out who decides what, through which forums, and how risks, exceptions and escalations are handled.",
      details:
        "Good governance is proportionate: enough control to manage risk, without slowing down routine decisions that teams can take themselves.",
      facts: [
        { label: "Accountable", value: "Steering committee" },
        { label: "Cadence", value: "Monthly forums" },
      ],
      checklist: [
        "Decision rights and approval thresholds",
        "Committees, forums and meeting cadence",
        "Escalation and exception paths",
        "Policies, standards and controls",
      ],
    },
    {
      id: "people",
      name: "People & Skills",
      icon: "people",
      description:
        "Ensures the capabilities, behaviours and career paths exist to run the operating model now and as it evolves.",
      details:
        "Links the skills the operating model needs to how people are hired, developed, recognised and supported in their careers.",
      facts: [
        { label: "Accountable", value: "HR business partner" },
        { label: "Key artefact", value: "Skills framework" },
      ],
      checklist: [
        "Capability and skills framework",
        "Learning and development paths",
        "Performance and recognition practices",
        "Culture and ways of working",
      ],
    },
    {
      id: "performance",
      name: "Performance & Measures",
      icon: "trendChart",
      description:
        "Tracks whether the operating model delivers its intended outcomes and feeds insight back into continuous improvement.",
      details:
        "A small set of well-defined measures, reviewed on a regular rhythm, is more useful than a large dashboard nobody acts on.",
      facts: [
        { label: "Accountable", value: "Performance lead" },
        { label: "Cadence", value: "Monthly dashboard" },
      ],
      checklist: [
        "KPIs with clear definitions and targets",
        "Reporting rhythm and dashboards",
        "Performance reviews and corrective actions",
        "Benchmarking against peers",
      ],
    },
    {
      id: "technology",
      name: "Technology & Data",
      icon: "database",
      description:
        "Covers the platforms, tools and data that enable the processes, automate routine work and support decision-making.",
      details:
        "Technology choices follow the processes they support; data has clear owners, quality rules and access controls.",
      facts: [
        { label: "Accountable", value: "Technology lead" },
        { label: "Key artefact", value: "Target architecture" },
      ],
      checklist: [
        "Enabling platforms and tools",
        "Data ownership, quality and access",
        "Automation opportunities",
        "Integration with enterprise systems",
      ],
    },
  ],
};
