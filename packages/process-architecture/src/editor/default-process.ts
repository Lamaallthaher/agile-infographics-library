import type { ProcessArchitectureInput } from "../renderer";

/**
 * Generic, fictional example used when the editor opens without stored content
 * and by "Reset to default". Replace it with any organisation's content: the
 * component has no built-in wording.
 */
export const DEFAULT_PROCESS_ARCHITECTURE: ProcessArchitectureInput = {
  version: 1,
  title: "Process architecture",
  subtitle: "From the value chain down to the activities of each process.",
  valueChains: [
    {
      id: "vc-main",
      title: "Core value chain",
      description: "How the organisation turns demand into delivered value.",
      owner: "Executive team",
      groups: [
        {
          id: "pg-steer",
          title: "Strategy & governance",
          category: "management",
          icon: "compass",
          processes: [{ id: "pr-plan", title: "Strategic planning", activities: [{ id: "ac-plan-1", title: "Set objectives" }, { id: "ac-plan-2", title: "Review performance" }] }],
        },
        {
          id: "pg-demand",
          title: "Understand demand",
          category: "core",
          icon: "search",
          processes: [
            {
              id: "pr-needs",
              title: "Capture needs",
              owner: "Business analyst",
              status: "active",
              activities: [
                { id: "ac-needs-1", title: "Collect requests" },
                { id: "ac-needs-2", title: "Prioritise", owner: "Product owner" },
              ],
            },
          ],
        },
        {
          id: "pg-deliver",
          title: "Deliver",
          category: "core",
          icon: "rocket",
          processes: [
            { id: "pr-build", title: "Build solution", activities: [{ id: "ac-build-1", title: "Design" }, { id: "ac-build-2", title: "Build and test" }] },
            { id: "pr-release", title: "Release", status: "planned", activities: [] },
          ],
        },
        {
          id: "pg-operate",
          title: "Operate & improve",
          category: "core",
          icon: "cog",
          processes: [{ id: "pr-run", title: "Run service", activities: [{ id: "ac-run-1", title: "Monitor" }, { id: "ac-run-2", title: "Resolve issues" }] }],
        },
        {
          id: "pg-enable",
          title: "Enabling services",
          category: "support",
          icon: "people",
          processes: [{ id: "pr-people", title: "People & skills", activities: [] }],
        },
      ],
    },
  ],
};
