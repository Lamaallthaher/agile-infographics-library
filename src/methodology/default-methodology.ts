import { DEFAULT_PRIMARY } from "../library/theme-generator";
import type { MethodologyAppearance, MethodologyFlowData } from "./types";

/**
 * Generic, fictional example used when the prototype opens and by
 * "Reset to default". Replace it with any project's content.
 */
export const DEFAULT_METHODOLOGY: MethodologyFlowData = {
  version: 1,
  title: "Building an assessment model",
  subtitle: "How reference material is turned into a structured set of assessment dimensions.",
  steps: [
    {
      id: "gather",
      kicker: "Discover",
      title: "Gather reference material",
      description: "",
      bullets: ["Industry frameworks and standards", "Regulatory and policy requirements", "Peer and benchmark practices"],
      takeaway: "Know which sources shape the assessment.",
      icon: "book",
    },
    {
      id: "derive",
      kicker: "Analyse",
      title: "Derive expectations",
      description: "Translate each source into concrete practices and outcomes the organisation should be able to demonstrate.",
      bullets: [],
      takeaway: "Every expectation traces back to a source.",
      icon: "clipboardCheck",
    },
    {
      id: "structure",
      kicker: "Structure",
      title: "Group into themes",
      description: "",
      bullets: ["Cluster related expectations", "Remove overlaps and gaps", "Validate coverage with stakeholders"],
      takeaway: "A clear, non-overlapping structure.",
      icon: "link",
    },
    {
      id: "define",
      kicker: "Define",
      title: "Shape the dimensions",
      description: "",
      bullets: ["Agree the purpose and scope of each dimension", "Write the checks used to assess it"],
      takeaway: "A repeatable basis for assessment.",
      icon: "cog",
    },
  ],
  wheel: {
    centerValue: "",
    centerLabel: "Assessment dimensions",
    resultTitle: "Outcome: a structured assessment model",
    resultDescription: "A consistent framework for evaluating current practice and organising findings.",
    dimensions: [
      { id: "governance", label: "Governance & Oversight", description: "Roles, decision rights and accountability.", icon: "balance", color: null },
      { id: "process", label: "Processes & Controls", description: "How work is defined, performed and checked.", icon: "workflow", color: null },
      { id: "people", label: "People & Skills", description: "Capabilities, training and ways of working.", icon: "people", color: null },
      { id: "technology", label: "Tools & Technology", description: "Platforms and automation that support the work.", icon: "server", color: null },
      { id: "data", label: "Data & Information", description: "Quality, ownership and use of information.", icon: "database", color: null },
      { id: "improvement", label: "Measurement & Improvement", description: "Metrics, reviews and continuous improvement.", icon: "gauge", color: null },
    ],
  },
};

export const DEFAULT_APPEARANCE: MethodologyAppearance = {
  version: 1,
  base: DEFAULT_PRIMARY,
  preset: "navy",
  overrides: {},
  typography: { scale: 1, titleWeight: 700, align: "left" },
  placement: "alternate",
  dimensionContent: "number",
};
