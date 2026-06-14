export const colors = {
  accent: "#e03670",
  background: "#fafafa",
  border: "rgba(24, 24, 27, 0.1)",
  danger: "#b42318",
  divider: "rgba(24, 24, 27, 0.08)",
  good: "#13795b",
  info: "#2563eb",
  inverse: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f4f4f5",
  surfacePressed: "#eeeeef",
  text: "#18181b",
  textMuted: "#71717a",
  textSubtle: "#a1a1aa",
  warning: "#a16207",
} as const

export const radii = {
  card: 22,
  pill: 999,
  row: 18,
} as const

export const spacing = {
  cardPadding: 16,
  pageBottom: 110,
  pageTop: 12,
  pageX: 18,
  rowGap: 12,
  sectionContentGap: 12,
  sectionGap: 30,
} as const

export const typography = {
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 39,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 25,
  },
  value: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 34,
  },
} as const
