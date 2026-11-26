import type { ActivityInput, ProcessArchitectureInput } from "@agile-infographics/process-architecture";

/**
 * Gallery sample data for the Process Architecture Map: a fictional IT service
 * organisation. The component itself contains no business content.
 */
const steps = (prefix: string, titles: string[], owners: string[] = []): ActivityInput[] =>
  titles.map((title, i) => ({ id: `${prefix}-a${i + 1}`, title, ...(owners[i] ? { owner: owners[i] } : {}) }));

export const PROCESS_EXAMPLE: ProcessArchitectureInput = {
  version: 1,
  kicker: "Operating model design · Process architecture",
  title: "IT service process architecture",
  subtitle:
    "The hierarchy below shows the four levels of the process architecture: the levels set out in the architecture structure, and the level detailed later in process-by-process design.",
  levels: [
    { label: "Level Zero", name: "Value chain", description: "Shows how the IT organisation **delivers value** from demand to running services." },
    { label: "Level One", name: "Process group", description: "Collects related processes into **clear areas of responsibility**." },
    { label: "Level Two", name: "Process", description: "Names the **processes in each group**, each with a defined purpose and outputs." },
    { label: "Level Three", name: "Activity", description: "Describes the **steps, roles and decisions** that make up each process." },
  ],
  scopes: [
    {
      title: "Architecture structure — value chain to process",
      description: "Sets out the value chain, the process groups and the processes, and links them to the capabilities they rely on.",
      levels: [0, 1, 2],
    },
    {
      title: "Detailed design — activities and controls",
      description: "Designs the activities, roles and decision points of each process, one process at a time.",
      levels: [3],
    },
  ],
  valueChains: [
    {
      id: "vc-it",
      title: "IT service value chain",
      description: "From understanding business demand to running and improving live services.",
      owner: "Chief Information Officer",
      status: "active",
      tags: ["Enterprise", "IT"],
      groups: [
        {
          id: "g-govern",
          title: "Strategy & governance",
          category: "management",
          icon: "balance",
          owner: "IT leadership team",
          processes: [
            {
              id: "p-strategy",
              title: "IT strategy & planning",
              description: "Translate business goals into an IT strategy and a funded roadmap.",
              owner: "Head of IT Strategy",
              status: "active",
              activities: steps("p-strategy", ["Assess business needs", "Define IT objectives", "Build the roadmap", "Approve and communicate"], ["Business relationship manager", "", "Enterprise architect", "IT steering committee"]),
            },
            {
              id: "p-portfolio",
              title: "Portfolio management",
              owner: "PMO lead",
              status: "active",
              tags: ["Investment"],
              activities: steps("p-portfolio", ["Collect demand", "Prioritise investments", "Track benefits"]),
            },
            {
              id: "p-risk",
              title: "Risk & compliance",
              owner: "IT risk manager",
              status: "in-review",
              activities: steps("p-risk", ["Identify risks", "Assess controls", "Report to the board"]),
            },
          ],
        },
        {
          id: "g-plan",
          title: "Plan & design",
          category: "core",
          icon: "compass",
          owner: "Head of Architecture",
          processes: [
            {
              id: "p-design",
              title: "Service design",
              description: "Shape new or changed services so they meet agreed requirements.",
              owner: "Service designer",
              status: "active",
              activities: steps("p-design", ["Capture requirements", "Design the solution", "Review the architecture", "Agree service levels"]),
            },
            { id: "p-capacity", title: "Capacity planning", owner: "Capacity manager", status: "planned", activities: steps("p-capacity", ["Forecast demand", "Model capacity"]) },
          ],
        },
        {
          id: "g-build",
          title: "Build & test",
          category: "core",
          icon: "layers",
          owner: "Head of Engineering",
          processes: [
            {
              id: "p-dev",
              title: "Software development",
              owner: "Engineering manager",
              status: "active",
              tags: ["Agile"],
              activities: steps("p-dev", ["Plan the sprint", "Build features", "Peer review", "Integrate"]),
            },
            {
              id: "p-test",
              title: "Testing & quality assurance",
              description: "Verify that changes work as intended before they reach users.",
              owner: "QA lead",
              status: "active",
              tags: ["Quality"],
              href: "https://example.com/quality-handbook",
              activities: [
                { id: "p-test-a1", title: "Plan tests", owner: "QA lead", description: "Agree scope, environments and entry criteria." },
                { id: "p-test-a2", title: "Execute tests", owner: "Test analyst", status: "active" },
                { id: "p-test-a3", title: "Log and triage defects", owner: "Test analyst" },
                { id: "p-test-a4", title: "Sign off the release", owner: "Product owner", tags: ["Gate"] },
              ],
            },
            { id: "p-release", title: "Release management", owner: "Release manager", status: "active", activities: steps("p-release", ["Schedule the release", "Deploy", "Verify in production"]) },
          ],
        },
        {
          id: "g-deliver",
          title: "Deliver & support",
          category: "core",
          icon: "chat",
          owner: "Head of Service Operations",
          processes: [
            { id: "p-desk", title: "Service desk", owner: "Service desk manager", status: "active", activities: steps("p-desk", ["Log the request", "Classify", "Resolve", "Close and survey"]) },
            {
              id: "p-incident",
              title: "Incident management",
              owner: "Incident manager",
              status: "active",
              tags: ["24/7"],
              activities: steps("p-incident", ["Detect", "Diagnose", "Restore service", "Post-incident review"]),
            },
            { id: "p-request", title: "Request fulfilment", owner: "Service desk manager", activities: steps("p-request", ["Approve", "Fulfil"]) },
          ],
        },
        {
          id: "g-improve",
          title: "Measure & improve",
          category: "core",
          icon: "trendChart",
          owner: "Head of Service Quality",
          processes: [
            { id: "p-problem", title: "Problem management", owner: "Problem manager", activities: steps("p-problem", ["Identify trends", "Find the root cause", "Remove the cause"]) },
            { id: "p-ci", title: "Continual improvement", owner: "Service quality manager", status: "planned", activities: steps("p-ci", ["Measure", "Analyse", "Improve"]) },
          ],
        },
        {
          id: "g-suppliers",
          title: "Suppliers & partners",
          category: "support",
          icon: "link",
          processes: [
            { id: "p-supplier", title: "Supplier management", owner: "Vendor manager", activities: steps("p-supplier", ["Select suppliers", "Manage contracts", "Review performance"]) },
          ],
        },
        {
          id: "g-people",
          title: "People & capability",
          category: "support",
          icon: "people",
          processes: [
            { id: "p-skills", title: "Skills planning", owner: "HR business partner", activities: steps("p-skills", ["Map skills", "Plan training"]) },
            { id: "p-onboard", title: "Onboarding", status: "retired", activities: [] },
          ],
        },
        {
          id: "g-security",
          title: "Security operations",
          category: "support",
          icon: "shield",
          processes: [
            { id: "p-access", title: "Access management", owner: "Security analyst", activities: steps("p-access", ["Request access", "Approve", "Review access"]) },
          ],
        },
      ],
    },
    {
      id: "vc-product",
      title: "Digital product delivery",
      description: "A second, smaller value chain: how digital products move from idea to launch.",
      owner: "Head of Digital",
      groups: [
        { id: "g-discover", title: "Discover", category: "core", icon: "search", processes: [{ id: "p-research", title: "User research", activities: steps("p-research", ["Interview users", "Synthesise findings"]) }] },
        { id: "g-shape", title: "Shape", category: "core", icon: "lightbulb", processes: [{ id: "p-prototype", title: "Prototyping", activities: steps("p-prototype", ["Sketch", "Test with users"]) }] },
        { id: "g-launch", title: "Launch", category: "core", icon: "rocket", processes: [{ id: "p-golive", title: "Go-live", activities: [] }] },
      ],
    },
  ],
};
