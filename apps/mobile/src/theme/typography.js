import { fontFamily } from "./colors";
import { fontSize, lineHeight, platformScale } from "./tokens";

/**
 * Prototype-aligned text style. Uses named font files only (no fontWeight)
 * so web renders at the intended size.
 */
export function protoType(size, family = "regular", lhRatio = lineHeight.body) {
  const fs = Math.round(size);
  return {
    fontFamily: fontFamily[family] || fontFamily.regular,
    fontSize: fs,
    lineHeight: Math.round(fs * lhRatio * platformScale) / platformScale
  };
}

export const type = {
  logo: { ...protoType(fontSize.logo, "logo", lineHeight.tight) },
  navSub: { ...protoType(fontSize.xs, "regular", lineHeight.tight) },
  sectionTitle: { ...protoType(fontSize.xl, "semibold") },
  sectionSub: { ...protoType(fontSize.md, "regular") },
  body: { ...protoType(fontSize.md, "regular") },
  bodyStrong: { ...protoType(fontSize.md, "medium") },
  caption: { ...protoType(fontSize.xs, "regular") },
  captionStrong: { ...protoType(fontSize.xs, "semibold") },
  label: { ...protoType(fontSize.md, "medium") },
  feedName: { ...protoType(fontSize.md, "semibold") },
  feedTime: { ...protoType(fontSize.xs, "regular", lineHeight.tight) },
  feedBody: { ...protoType(fontSize.md, "regular") },
  exploreCategory: { ...protoType(fontSize.xs, "semibold", lineHeight.tight) },
  exploreTitle: { ...protoType(fontSize.base, "semibold", lineHeight.title) },
  exploreDesc: { ...protoType(fontSize.sm, "regular", lineHeight.explore) },
  profileName: { ...protoType(fontSize.base, "semibold") },
  profileMeta: { ...protoType(fontSize.sm, "regular", lineHeight.tight) },
  uppercaseLabel: {
    ...protoType(fontSize.xs, "semibold", lineHeight.tight),
    textTransform: "uppercase",
    letterSpacing: 0.77
  },
  link: { ...protoType(fontSize.sm, "semibold") },
  tab: { ...protoType(fontSize.sm, "medium") },
  tabActive: { ...protoType(fontSize.sm, "semibold") },
  metricLabel: { ...protoType(fontSize.xs, "regular", lineHeight.tight) },
  metricValue: { ...protoType(fontSize.metric, "semibold", lineHeight.tight) },
  metricUnit: { ...protoType(fontSize.sm, "regular", lineHeight.tight) },
  cardTitle: {
    ...protoType(fontSize.xs, "semibold", lineHeight.tight),
    textTransform: "uppercase",
    letterSpacing: 0.77
  },
  scienceTitle: { ...protoType(fontSize.md, "semibold", lineHeight.tight) },
  scienceText: { ...protoType(fontSize.sm, "regular") },
  button: { ...protoType(fontSize.lg, "semibold") },
  buttonMd: { ...protoType(fontSize.base, "semibold") },
  chip: { ...protoType(fontSize.sm, "medium") }
};
