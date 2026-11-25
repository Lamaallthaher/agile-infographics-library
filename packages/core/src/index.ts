/**
 * @agile-infographics/core — generic building blocks shared by the infographic
 * components. It must never import from a component package.
 */
export * from "./theme";
export { icons, ICON_KEYS, ICON_NAMES, isIconKey } from "./icons";
export type { IconKey } from "./icons";
export { EditableText, IconPicker, ThemeColorControl } from "./editing";
export type { EditableTextProps, IconPickerProps, ThemeColorControlProps } from "./editing";
export { loadJson, newId, removeKey, saveJson } from "./storage";
export { useThemeColor } from "./useThemeColor";
