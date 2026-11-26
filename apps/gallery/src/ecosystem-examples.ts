import type { EcosystemAppearance, EcosystemMapInput } from "@agile-infographics/ecosystem-map";

/**
 * Gallery sample data for the Ecosystem & Interfaces Map. These are examples
 * only: the component itself contains no business content. Each example uses a
 * different number of groups, items and appearance to show that the same
 * component serves different contexts.
 */
export interface EcosystemExample {
  id: string;
  label: string;
  description: string;
  data: EcosystemMapInput;
  appearance: Partial<EcosystemAppearance>;
}

const itQuality: EcosystemMapInput = {
  version: 1,
  title: "IT Quality: ecosystem and interfaces",
  subtitle: "The functions, teams and stakeholders an IT quality function works with.",
  center: { id: "center", title: "IT Quality", subtitle: "Quality & governance", icon: "shield", style: "rings" },
  groups: [
    {
      id: "leadership",
      title: "Leadership",
      icon: "orgChart",
      items: [
        { id: "lead-exec", label: "Executive leadership" },
        { id: "lead-steering", label: "IT steering committee", tag: "Monthly" },
        { id: "lead-strategy", label: "Strategy & planning office" },
      ],
    },
    {
      id: "digital",
      title: "Digital Transformation",
      icon: "rocket",
      items: [
        { id: "dt-office", label: "Transformation office" },
        { id: "dt-portfolio", label: "Portfolio & programme management" },
        { id: "dt-change", label: "Change management" },
      ],
    },
    {
      id: "data",
      title: "Data & Analytics",
      icon: "database",
      items: [
        { id: "data-gov", label: "Data governance" },
        { id: "data-bi", label: "Business intelligence & reporting" },
        { id: "data-quality", label: "Data quality management", description: "Rules, monitoring and remediation of data defects." },
      ],
    },
    {
      id: "other",
      title: "Other Interfaces",
      icon: "link",
      items: [
        { id: "other-audit", label: "Internal audit" },
        { id: "other-risk", label: "Risk & compliance" },
        { id: "other-procurement", label: "Procurement & vendor management" },
        { id: "other-users", label: "Business users" },
      ],
    },
    {
      id: "development",
      title: "Development",
      icon: "layers",
      items: [
        { id: "dev-apps", label: "Application development" },
        { id: "dev-testing", label: "Testing & quality assurance", tag: "Per release" },
        { id: "dev-release", label: "Release management" },
      ],
    },
    {
      id: "infrastructure",
      title: "IT Infrastructure",
      icon: "server",
      items: [
        { id: "infra-platforms", label: "Networks & platforms" },
        { id: "infra-ops", label: "Service operations" },
        { id: "infra-security", label: "Information security" },
      ],
    },
  ],
  connections: [
    { source: "leadership", target: "center", label: "Direction", direction: "forward" },
    { source: "center", target: "digital", label: "Assurance", direction: "forward" },
    { source: "center", target: "data", label: "Data standards", direction: "both" },
    { source: "center", target: "other", label: "Reporting", direction: "both", style: "dashed" },
    { source: "center", target: "development", label: "Quality gates", direction: "both" },
    { source: "center", target: "infrastructure", label: "Service quality", direction: "forward" },
  ],
};

const digitalTransformation: EcosystemMapInput = {
  version: 1,
  title: "Digital transformation ecosystem",
  subtitle: "Partners and stakeholders around a transformation office, and how each one contributes.",
  center: { id: "dto", title: "Transformation Office", subtitle: "Programme hub", icon: "compass", style: "solid" },
  groups: [
    {
      id: "business",
      title: "Business units",
      description: "Own the outcomes and adopt the new ways of working.",
      icon: "people",
      items: [
        { id: "bu-sales", label: "Sales & service", tag: "Pilot" },
        { id: "bu-operations", label: "Operations" },
        { id: "bu-finance", label: "Finance" },
      ],
    },
    {
      id: "technology",
      title: "Technology partners",
      icon: "cloud",
      items: [
        { id: "tech-cloud", label: "Cloud platform provider", href: "https://example.com/cloud" },
        { id: "tech-integrator", label: "Systems integrator" },
        { id: "tech-security", label: "Security services" },
      ],
    },
    {
      id: "customers",
      title: "Customers",
      icon: "chat",
      items: [
        { id: "cust-panel", label: "Customer advisory panel", description: "Tests new journeys before launch." },
        { id: "cust-feedback", label: "Feedback channels" },
      ],
    },
    {
      id: "regulators",
      title: "Regulators & standards bodies",
      icon: "checkCircle",
      items: [
        { id: "reg-privacy", label: "Data protection authority" },
        { id: "reg-standards", label: "Industry standards" },
      ],
    },
    {
      id: "innovation",
      title: "Innovation network",
      icon: "lightbulb",
      items: [
        { id: "inno-startups", label: "Start-up programme" },
        { id: "inno-academia", label: "University partnerships" },
        { id: "inno-lab", label: "Internal innovation lab" },
      ],
    },
    {
      id: "pilots",
      title: "Internal pilots (draft)",
      icon: "flag",
      hidden: true,
      items: [{ id: "pilot-1", label: "Pilot candidates under review" }],
    },
  ],
  connections: [
    { source: "dto", target: "business", label: "Roadmap", direction: "both" },
    { source: "technology", target: "dto", label: "Platforms", direction: "forward" },
    { source: "dto", target: "customers", label: "Journeys", direction: "forward" },
    { source: "regulators", target: "dto", label: "Requirements", direction: "forward", style: "dashed" },
    { source: "innovation", target: "dto", label: "Ideas", direction: "forward", style: "dotted" },
  ],
};

const operatingModel: EcosystemMapInput = {
  version: 1,
  title: "Business operating model interfaces",
  subtitle: "The building blocks of an operating model and the interfaces between them and the core.",
  center: { id: "core", title: "Operating Model", subtitle: "How value is delivered", icon: "target", style: "outline" },
  groups: [
    { id: "strategy", title: "Strategy", icon: "compass", items: [{ id: "st-1", label: "Vision & objectives" }, { id: "st-2", label: "Portfolio priorities" }] },
    { id: "customers", title: "Customers & channels", icon: "people", items: [{ id: "cu-1", label: "Segments" }, { id: "cu-2", label: "Channels" }, { id: "cu-3", label: "Service levels" }] },
    {
      id: "products",
      title: "Products & services",
      icon: "puzzle",
      items: [
        { id: "pr-1", label: "Core products" },
        { id: "pr-2", label: "Value-added services" },
        { id: "pr-3", label: "Pricing" },
      ],
    },
    {
      id: "processes",
      title: "Processes",
      icon: "workflow",
      items: [
        { id: "pc-1", label: "Plan" },
        { id: "pc-2", label: "Source" },
        { id: "pc-3", label: "Make" },
        { id: "pc-4", label: "Deliver" },
        { id: "pc-5", label: "Service" },
        { id: "pc-6", label: "Return" },
        { id: "pc-7", label: "Enable" },
        { id: "pc-8", label: "Improve", description: "Continuous improvement across all processes." },
      ],
    },
    { id: "people", title: "People & organisation", icon: "orgChart", items: [{ id: "pe-1", label: "Structure & roles" }, { id: "pe-2", label: "Skills" }, { id: "pe-3", label: "Culture" }] },
    { id: "technology", title: "Technology & data", icon: "server", items: [{ id: "te-1", label: "Applications" }, { id: "te-2", label: "Data & analytics" }] },
    { id: "finance", title: "Finance", icon: "coins", items: [{ id: "fi-1", label: "Budgeting" }, { id: "fi-2", label: "Performance management" }] },
    { id: "partners", title: "Partners & suppliers", icon: "link", items: [{ id: "pa-1", label: "Key suppliers" }, { id: "pa-2", label: "Outsourcing partners" }] },
  ],
};

export const ECOSYSTEM_EXAMPLES: readonly EcosystemExample[] = [
  {
    id: "it-quality",
    label: "IT Quality",
    description: "Six functional groups around an IT quality function (sample data based on the reference concept).",
    data: itQuality,
    appearance: {},
  },
  {
    id: "digital-transformation",
    label: "Digital Transformation",
    description: "Five partner groups (plus one hidden draft group), a light theme, elbow connectors and progressive group colours.",
    data: digitalTransformation,
    appearance: { base: "#0f766e", preset: "teal", scheme: "light", connector: "elbow", cardStyle: "filled", groupColoring: "ramp" },
  },
  {
    id: "operating-model",
    label: "Operating Model",
    description: "Eight building blocks, compact spacing, outline cards and a long group that collapses.",
    data: operatingModel,
    appearance: { base: "#7b2cbf", preset: "plum", cardStyle: "outline", density: "compact", radius: "round", connector: "straight" },
  },
];
