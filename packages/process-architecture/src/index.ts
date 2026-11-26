/**
 * @agile-infographics/process-architecture — the Process Architecture Map.
 *
 *   "@agile-infographics/process-architecture"           editor + renderer (everything below)
 *   "@agile-infographics/process-architecture/renderer"  display-only renderer, data model and theme
 *
 * Depends only on @agile-infographics/core; never on another component.
 */
export * from "./editor";
export * from "./renderer";
