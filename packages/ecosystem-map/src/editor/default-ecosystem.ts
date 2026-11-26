import type { EcosystemMapInput } from "../renderer";

/**
 * Generic, fictional example used when the editor opens without stored content
 * and by "Reset to default". Replace it with any project's content: the
 * component has no built-in wording.
 */
export const DEFAULT_ECOSYSTEM: EcosystemMapInput = {
  version: 1,
  title: "Service ecosystem",
  subtitle: "Who the central function works with, and through which interfaces.",
  center: { id: "center", title: "Core service", subtitle: "Central function", icon: "network", style: "rings" },
  groups: [
    {
      id: "governance",
      title: "Governance",
      description: "Sets direction and oversees performance.",
      icon: "balance",
      items: [
        { id: "governance-board", label: "Steering board", tag: "Quarterly" },
        { id: "governance-policy", label: "Policy owners" },
        { id: "governance-risk", label: "Risk & compliance" },
      ],
    },
    {
      id: "delivery",
      title: "Delivery teams",
      icon: "cog",
      items: [
        { id: "delivery-product", label: "Product owners" },
        { id: "delivery-engineering", label: "Engineering" },
        { id: "delivery-quality", label: "Quality assurance", description: "Test strategy and release checks." },
      ],
    },
    {
      id: "customers",
      title: "Customers",
      icon: "people",
      items: [
        { id: "customers-internal", label: "Internal users" },
        { id: "customers-external", label: "External clients" },
        { id: "customers-support", label: "Support channels" },
      ],
    },
    {
      id: "partners",
      title: "Partners",
      icon: "puzzle",
      items: [
        { id: "partners-suppliers", label: "Suppliers" },
        { id: "partners-vendors", label: "Technology vendors" },
      ],
    },
  ],
  connections: [
    { source: "governance", target: "center", label: "Direction", direction: "forward" },
    { source: "center", target: "delivery", label: "Requirements", direction: "both" },
    { source: "center", target: "customers", label: "Services", direction: "forward" },
    { source: "partners", target: "center", label: "Supply", direction: "forward", style: "dashed" },
  ],
};
