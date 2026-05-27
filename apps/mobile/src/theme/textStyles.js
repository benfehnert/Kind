import { StyleSheet } from "react-native";
import { colors } from "./colors";
import { fontSize, heights, letterSpacing, radius, spacing } from "./tokens";
import { type } from "./typography";

export const layout = StyleSheet.create({
  screenPad: {
    padding: spacing.screen,
    paddingBottom: spacing.screenBottom
  },
  screenPadH: { paddingHorizontal: spacing.screen },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.cardY,
    paddingHorizontal: spacing.cardX,
    marginBottom: spacing.blockMb
  },
  feedItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.cardY,
    paddingHorizontal: spacing.cardX,
    marginBottom: spacing.feedMb
  },
  feedMore: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderMed,
    borderRadius: radius.lg,
    paddingVertical: spacing.cardY,
    paddingHorizontal: spacing.cardX,
    marginBottom: spacing.feedMb,
    alignItems: "center"
  },
  logForm: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.lg,
    padding: spacing.screen,
    marginBottom: spacing.blockMb
  }
});

export const text = StyleSheet.create({
  sectionTitle: {
    ...type.sectionTitle,
    color: colors.text,
    marginBottom: spacing.xs
  },
  sectionSub: {
    ...type.sectionSub,
    color: colors.textMuted,
    marginBottom: spacing.sectionGap
  },
  body: { ...type.body, color: colors.textMuted },
  bodyStrong: { ...type.bodyStrong, color: colors.text },
  caption: { ...type.caption, color: colors.textMuted },
  captionStrong: { ...type.captionStrong, color: colors.textMuted },
  label: { ...type.label, color: colors.text },
  feedName: { ...type.feedName, color: colors.text },
  feedTime: { ...type.feedTime, color: colors.textMuted, marginTop: 1 },
  feedBody: { ...type.feedBody, color: colors.textMuted },
  exploreCategory: {
    ...type.exploreCategory,
    color: colors.greenDark,
    letterSpacing: letterSpacing.category,
    marginBottom: 3
  },
  exploreTitle: { ...type.exploreTitle, color: colors.text, marginBottom: 2 },
  exploreDesc: { ...type.exploreDesc, color: colors.textMuted, marginTop: 2 },
  profileName: { ...type.profileName, color: colors.text },
  profileMeta: { ...type.profileMeta, color: colors.textMuted, marginTop: 1 },
  uppercaseLabel: { ...type.uppercaseLabel, color: colors.textMuted },
  link: { ...type.link, color: colors.greenDark },
  back: { ...type.buttonMd, color: colors.greenDark },
  feedMoreTitle: { ...type.buttonMd, color: colors.greenDark },
  feedMoreSub: { ...type.exploreDesc, color: colors.textMuted, marginTop: spacing.xs, textAlign: "center" },
  feedHighlight: { ...type.exploreDesc, color: colors.greenDark }
});

export { fontSize, spacing, heights, radius };
